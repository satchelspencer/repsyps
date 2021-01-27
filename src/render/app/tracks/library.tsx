import React, {
  useCallback,
  useContext,
  useRef,
  useMemo,
  useState,
  useEffect,
  memo,
} from 'react'
import * as _ from 'lodash'
import ctyled, { CtyledContext, active, inline } from 'ctyled'
import * as pathUtils from 'path'
import electron from 'electron'
import TimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'

import { useSelector, useDispatch, useStore } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import * as Types from 'render/util/types'
import { getPath } from 'render/loading/app-paths'
import { palette } from 'render/components/theme'

import ResizableBorder from 'render/components/rborder'
import Icon from 'render/components/icon'
import { FillMessage, SelectableButton, SearchInput } from 'render/components/misc'

import {
  loadProjectScenes,
  loadProjectScene,
  loadProjectTrack,
} from 'render/loading/project'

TimeAgo.addLocale(en)
const timeAgo = new TimeAgo('en-US')

const LibraryWrapper = ctyled.div.attrs({ widthp: 25 }).styles({
  column: true,
  bg: true,
  lined: true,
  color: (c) => c.nudge(0),
}).extendSheet`
  width:${({ size }, { widthp }) => size * widthp}px;
`

const LibraryHeader = ctyled.div.styles({
  color: (c) => c.nudge(0.1),
  bg: true,
  column: true,
  lined: true,
})

const LibraryBody = ctyled.div.styles({
  flex: 1,
  scroll: true,
  width: '100%',
  column: true,
})

const LibraryLined = ctyled.div.styles({
  width: '100%',
  column: true,
  lined: true,
  endLine: true,
})

const SearchWrapper = ctyled.div.styles({
  width: '100%',
  column: true,
  gutter: 1,
  padd: 1,
  color: (c) => c.contrast(0.02),
})

const SearchInner = ctyled.div.styles({
  align: 'center',
  gutter: 1,
})

const ClosedLibWrapper = ctyled.div.class(active).styles({
  column: true,
  bg: true,
  hover: 0.3,
  color: (c) => c.nudge(-0.1),
  padd: 1,
  justify: 'center',
  align: 'center',
  width: 2,
})

const ClosedLibText = ctyled.div.styles({
  justify: 'center',
  color: (c) => c.contrast(-0.1),
}).extendSheet`
  transform:rotate(90deg);
  transform-origin:50% 50%;
  width:${({ size }) => size * 20}px;
  text-align:center;
`

const MIN_LIB_SIZE = 8,
  clip = (size: number) => Math.min(Math.max(size, MIN_LIB_SIZE), 50)

const LibItem = ctyled.div
  .class(active)
  .attrs<{ depth: number; hilight?: boolean }>({ depth: 0, hilight: false })
  .styles({
    height: 2.25,
    align: 'center',
    bg: true,
    gutter: 1,
    hover: 0.4,
    color: (c, { depth }) => c.nudge(-0.05 - depth * 0.09),
    bgColor: (c, { hilight }) => c.as(hilight ? palette.green : palette.gray),
  }).extendInline`
  padding-left:${({ size }, { depth }) => size / 2 + (size / 1.5) * depth}px;
  padding-right:${({ size }) => size / 2}px;
`

const OverflowNameWrapper = ctyled.div.styles({
  flex: 1,
  height: 1.2,
})

const OverflowNameInner = ctyled.div.styles({}).extendSheet`
  position:absolute;
  top:0;
  left:0;
  right:0;
  bottom:0;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
  display:block;
`

export interface OverflowNameProps {
  name: any
}

function ItemName(props: OverflowNameProps) {
  return (
    <OverflowNameWrapper>
      <OverflowNameInner>{props.name}</OverflowNameInner>
    </OverflowNameWrapper>
  )
}

const TempoDelta = ctyled.div.class(inline).styles({
  color: (c) => c.contrast(0.2),
  bg: true,
  rounded: true,
  padd: 0.5,
  size: (s) => s * 0.85,
  width: 4,
  justify: 'center',
})

const Time = ctyled.div.styles({ size: (s) => s * 0.8, color: (c) => c.contrast(-0.1) })

const ProjectWrapper = ctyled.div.styles({
  column: true,
  lined: true,
})

const IconBuffer = ctyled.div.styles({ width: 1.1 })

export interface LibraryProjectProps {
  project: Types.LibraryProject
  path: string
  period: number
  match: LibraryMatchState
}

const getRatioStr = (ratio: number | null): string => {
  if (ratio === null) return '??'
  else if (ratio === 0) return '+0.0'
  else {
    const rounded = _.round(ratio, Math.abs(ratio) > 10 ? 0 : 1)
    return (rounded > 0 ? '+' : '') + rounded
  }
}

const formatDate = (mTime: number): string => {
  return _.last(timeAgo.format(mTime, 'twitter').split(', ')) ?? '?'
}

const LibraryProject = memo((props: LibraryProjectProps) => {
  const trackCount = _.keys(props.project.tracks).length,
    hasMultipleTracks = trackCount > 1,
    hasMultipleScenes = props.project.scenes.length > 1,
    root = getPath('library'),
    projectName = pathUtils.relative(root, props.path).replace(/\.syp$/g, ''),
    [open, setOpen] = useState(false),
    clickTimeoutRef = useRef<NodeJS.Timeout | null>(null),
    handleToggleOpen = useCallback(() => {
      if (!clickTimeoutRef.current)
        clickTimeoutRef.current = setTimeout(() => {
          setOpen(!open)
          clickTimeoutRef.current = null
        }, 300)
    }, [open]),
    store = useStore(),
    handleDoubleClick = useCallback(
      (e) => {
        if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
        loadProjectScenes(props.path, store, e.shiftKey)
      },
      [props.path, store]
    ),
    [showAll, setShowAll] = useState(false),
    matchingCount = _.keys(props.match.tracks).length,
    hasTrackMatch = matchingCount > 0,
    showNotMatching = !hasTrackMatch || showAll,
    notMatchingCount = showNotMatching ? 0 : trackCount - matchingCount,
    handleShowAll = useCallback(() => setShowAll(true), []),
    projectRatio = (props.project.avgPeriod / props.period - 1) * 100

  useEffect(() => {
    setOpen(hasTrackMatch)
    setShowAll(false)
  }, [hasTrackMatch])

  return (
    <ProjectWrapper>
      {hasMultipleTracks && (
        <LibItem depth={0} onClick={handleToggleOpen} onDoubleClick={handleDoubleClick}>
          <ItemName name={projectName} />
          <Time>{formatDate(props.project.mTime)}</Time>
          <TempoDelta>{getRatioStr(projectRatio)}%</TempoDelta>
          <Icon name={open ? 'caret-down' : 'caret-right'} scale={1.2} />
        </LibItem>
      )}
      {(!hasMultipleTracks || open) &&
        _.map(props.project.scenes, (scene, sceneIndex) => {
          const sceneHasMultiple =
              scene.trackIds.filter((id) => showNotMatching || props.match.tracks[id])
                .length > 1,
            trackDepth =
              (sceneHasMultiple && hasMultipleScenes ? 1 : 0) +
              (hasMultipleTracks ? 1 : 0)
          return (
            <React.Fragment key={sceneIndex}>
              {hasMultipleScenes && sceneHasMultiple && (
                <LibItem
                  depth={1}
                  onDoubleClick={(e) =>
                    loadProjectScene(props.path, store, sceneIndex, e.shiftKey)
                  }
                >
                  <ItemName name={'Scene ' + (sceneIndex + 1)} />
                </LibItem>
              )}
              {scene.trackIds.map((trackId) => {
                const track = props.project.tracks[trackId],
                  ratio = track.avgPeriod && (track.avgPeriod / props.period - 1) * 100
                return (
                  (showNotMatching || props.match.tracks[trackId]) && (
                    <LibItem
                      depth={trackDepth}
                      key={trackId}
                      hilight={
                        !!props.match.tracks[trackId] && hasMultipleTracks && showAll
                      }
                      onDoubleClick={(e) =>
                        loadProjectTrack(props.path, store, trackId, e.shiftKey)
                      }
                    >
                      <ItemName
                        name={
                          (sceneHasMultiple || !hasMultipleTracks
                            ? ''
                            : 'Scene ' + (sceneIndex + 1) + ': ') +
                          (hasMultipleTracks ? track.name : projectName)
                        }
                      />
                      {trackDepth === 0 && <Time>{formatDate(props.project.mTime)}</Time>}
                      <TempoDelta>{getRatioStr(ratio)}%</TempoDelta>
                      {trackDepth === 0 && <IconBuffer />}
                    </LibItem>
                  )
                )
              })}
            </React.Fragment>
          )
        })}
      {notMatchingCount > 0 && open && (
        <LibItem depth={1} onClick={handleShowAll}>
          + {notMatchingCount} more track{notMatchingCount > 1 ? 's' : ''}
        </LibItem>
      )}
    </ProjectWrapper>
  )
})

export interface LibraryFilter {
  sortPeriod: number | null
  filterText: string | null
}

export interface LibraryMatchState {
  project: boolean
  tracks: { [trackId: string]: boolean }
}

export const LibraryPath = ctyled.div.class(active).styles({
  gutter: 1,
  padd: 1,
  align: 'center',
  width: '100%',
  height: 2.7,
  bg: true,
  hover: 0.25,
  color: (c) => c.nudge(0.1),
})

export const LibraryPathName = ctyled.div.styles({
  flex: 1,
  height: 1.7,
})

export const LibraryPathInner = ctyled.div.styles({}).extendSheet`
  position:absolute;
  top:0;
  left:0;
  right:0;
  bottom:0;
  display:block;
  overflow:hidden;
  white-space:nowrap;
  text-overflow: ellipsis;
  line-height:${({ size }) => size * 1.6}px;
  direction: rtl;
  text-align:center;
`

function Library() {
  const { libSize, libOpen } = useSelector((state) => state.settings),
    library = useSelector((state) => state.library),
    period = useSelector(Selectors.getGlobalPlayback).period,
    dispatch = useDispatch(),
    [offset, setOffset] = useState(0),
    [sortBy, setSortBy] = useState<'tempo' | 'date' | 'name'>('tempo'),
    size = useContext(CtyledContext).theme.size,
    handleMove = useCallback(
      (delta) => {
        setOffset(offset - delta / size)
        const newLibSize = (-1 * delta) / size + offset + libSize
        if (newLibSize < MIN_LIB_SIZE) dispatch(Actions.setSettings({ libOpen: false }))
      },
      [size, offset, libSize]
    ),
    handleCommit = useCallback(
      (delta) => {
        const newLibSize = (-1 * delta) / size + offset + libSize
        setOffset(0)
        if (newLibSize >= MIN_LIB_SIZE)
          dispatch(Actions.setSettings({ libSize: clip(newLibSize) }))
      },
      [size, offset, libSize]
    ),
    widthp = clip(libSize + offset),
    handleLibOpen = useCallback(
      () => dispatch(Actions.setSettings({ libOpen: true })),
      []
    ),
    [searchText, setSearchText] = useState(''),
    handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchText(e.target.value)
    }, []),
    handleKeyDown = useCallback((e) => {
      e.stopPropagation()
    }, []),
    handleSearchClear = useCallback(() => setSearchText(''), []),
    handleOpenLib = useCallback(() => {
      const path = electron.remote.dialog.showOpenDialogSync({
        defaultPath: getPath('/'),
        buttonLabel: 'Open Library',
        properties: ['openDirectory'],
      })
      if (path && path[0]) dispatch(Actions.setLibraryState({ root: path[0] }))
    }, []),
    bodyRef = useRef<HTMLDivElement | null>(null),
    [maxResults, setMaxResults] = useState(40),
    handleIncMaxResults = useCallback(() => {
      setMaxResults(maxResults + 20)
    }, [maxResults])

  const [filterState, setFilterState] = useState<LibraryFilter>({
      sortPeriod: null,
      filterText: null,
    }),
    applyFilterState = useCallback(
      _.debounce((newFilter: LibraryFilter) => {
        setFilterState(newFilter)
        setMaxResults(40)
      }, 300),
      []
    )
  useEffect(() => {
    applyFilterState({
      filterText: searchText ? searchText.toLowerCase() : null,
      sortPeriod: period,
    })
  }, [searchText, period])

  const { paths, matches, hasLibrary } = useMemo(() => {
    const matches: {
        [path: string]: LibraryMatchState
      } = {},
      allPaths = _.keys(library.projects),
      filtered = allPaths.filter((path) => {
        const trackMatches = {},
          projectMatches = !!(
            filterState.filterText && path.toLowerCase().includes(filterState.filterText)
          ),
          trackHasMatch = _.some(library.projects[path].tracks, (track, trackId) => {
            const match =
              filterState.filterText &&
              track.name.toLowerCase().includes(filterState.filterText)
            if (match) trackMatches[trackId] = true
            return !!match
          }),
          anyMatch = !filterState.filterText || projectMatches || trackHasMatch

        if (anyMatch) matches[path] = { project: projectMatches, tracks: trackMatches }
        return anyMatch
      }),
      sorted = _.sortBy(filtered, (path) => {
        const project = library.projects[path]
        if (sortBy === 'tempo')
          return Math.abs(project.avgPeriod - (filterState.sortPeriod ?? 0))
        else if (sortBy === 'date') return project.mTime * -1
        else if (sortBy === 'name') return path
        else return 1
      })
    if (bodyRef.current) bodyRef.current.scrollTop = 0
    return {
      paths: sorted,
      matches,
      hasLibrary: allPaths.length > 0,
    }
  }, [library.projects, filterState, sortBy])

  return libOpen ? (
    <LibraryWrapper widthp={widthp}>
      <LibraryHeader>
        <LibraryPath onClick={handleOpenLib}>
          <LibraryPathName>
            <LibraryPathInner>{library.root.replace('/', '')}</LibraryPathInner>
          </LibraryPathName>
        </LibraryPath>
        <SearchWrapper>
          <SearchInner>
            <SearchInput
              value={searchText}
              onKeyDown={handleKeyDown}
              onChange={handleSearchChange}
              placeholder="search by name"
            />
            <Icon asButton onClick={handleSearchClear} scale={1.3} name="close-thin" />
          </SearchInner>
          <SearchInner>
            <Icon name="twoway" scale={1.5} />
            <SelectableButton
              selected={sortBy === 'tempo'}
              onClick={() => setSortBy('tempo')}
            >
              Tempo
            </SelectableButton>
            <SelectableButton
              selected={sortBy === 'date'}
              onClick={() => setSortBy('date')}
            >
              Date
            </SelectableButton>
            <SelectableButton
              selected={sortBy === 'name'}
              onClick={() => setSortBy('name')}
            >
              Name
            </SelectableButton>
          </SearchInner>
        </SearchWrapper>
      </LibraryHeader>
      <LibraryBody inRef={bodyRef}>
        {!hasLibrary && !library.scanning && (
          <FillMessage>No Tracks in Library</FillMessage>
        )}
        {hasLibrary && !paths.length && <FillMessage>No Results</FillMessage>}
        {!!paths.length && (
          <LibraryLined>
            {paths.map((path, i) => {
              return (
                i < maxResults && (
                  <LibraryProject
                    period={filterState.sortPeriod ?? 0}
                    key={path}
                    path={path}
                    project={library.projects[path]}
                    match={matches[path]}
                  />
                )
              )
            })}
            {paths.length > maxResults && (
              <LibItem
                styles={{ justify: 'center' }}
                onClick={handleIncMaxResults}
                depth={1}
              >
                <u>show more...</u>
              </LibItem>
            )}
          </LibraryLined>
        )}
      </LibraryBody>
      <ResizableBorder
        onMove={handleMove}
        onCommit={handleCommit}
        vertical={false}
        start={true}
      />
    </LibraryWrapper>
  ) : (
    <ClosedLibWrapper onClick={handleLibOpen}>
      <ClosedLibText>Track Library</ClosedLibText>
    </ClosedLibWrapper>
  )
}

export default memo(Library)
