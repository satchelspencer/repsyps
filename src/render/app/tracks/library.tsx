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

import { useSelector, useDispatch, useStore } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import * as Types from 'render/util/types'
import { getPath } from 'render/loading/app-paths'
import { palette } from 'render/components/theme'

import ResizableBorder from 'render/components/rborder'
import Icon from 'render/components/icon'

import {
  loadProjectScenes,
  loadProjectScene,
  loadProjectTrack,
} from 'render/loading/project'

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
})

const LibraryBody = ctyled.div.styles({
  flex: 1,
  scroll: true,
  width: '100%',
  column: true,
  lined: true,
  endLine: true,
})

const SearchWrapper = ctyled.div.styles({
  gutter: 1,
  padd: 1,
  align: 'center',
  width: '100%',
})

const SearchInput = ctyled.input.styles({
  rounded: true,
  flex: 1,
  border: 1,
  bg: true,
  height: 1.9,
  color: (c) => c.nudge(0.15),
}).extendSheet`
  outline-color: #f59797;
  outline-width: 2px;
  padding:${({ size }) => `0px ${size / 2}px`};
  color:${({ color }) => color.fg} !important;
  min-width:0px;
`

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
  }).extend`
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

const getRatioStr = (ratio: number): string => {
  if (ratio === 0) return '+0.0'
  else {
    const rounded = _.round(ratio, Math.abs(ratio) > 10 ? 0 : 1)
    return (rounded > 0 ? '+' : '') + rounded
  }
}

const LibraryProject = memo((props: LibraryProjectProps) => {
  const trackCount = _.keys(props.project.tracks).length,
    hasMultipleTracks = trackCount > 1,
    hasMultipleScenes = props.project.scenes.length > 1,
    root = getPath('library'),
    projectName = pathUtils.relative(root, props.path).replace(/\.syp$/g, ''),
    [open, setOpen] = useState(false),
    clickTimeoutRef = useRef(null),
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
        clearTimeout(clickTimeoutRef.current)
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
  }, [props.match])

  return (
    <ProjectWrapper>
      {hasMultipleTracks && (
        <LibItem depth={0} onClick={handleToggleOpen} onDoubleClick={handleDoubleClick}>
          <ItemName name={projectName} />
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
                  ratio = (track.avgPeriod / props.period - 1) * 100
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
  sortPeriod: number
  filterText: string
}

export interface LibraryMatchState {
  project: boolean
  tracks: { [trackId: string]: boolean }
}

function Library() {
  const { libSize, libOpen } = useSelector((state) => state.settings),
    library = useSelector((state) => state.library),
    period = useSelector(Selectors.getGlobalPlayback).period,
    dispatch = useDispatch(),
    [offset, setOffset] = useState(0),
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
    bodyRef = useRef(null),
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

  const { paths, matches } = useMemo(() => {
    const matches: {
        [path: string]: LibraryMatchState
      } = {},
      filtered = _.keys(library.projects).filter((path) => {
        const trackMatches = {},
          projectMatches = path.toLowerCase().includes(filterState.filterText),
          trackHasMatch = _.some(library.projects[path].tracks, (track, trackId) => {
            const match = track.name.toLowerCase().includes(filterState.filterText)
            if (match) trackMatches[trackId] = true
            return match
          }),
          anyMatch = !filterState.filterText || projectMatches || trackHasMatch

        if (anyMatch) matches[path] = { project: projectMatches, tracks: trackMatches }
        return anyMatch
      }),
      sorted = _.sortBy(filtered, (path) =>
        Math.abs(library.projects[path].avgPeriod - filterState.sortPeriod)
      )
    if (bodyRef.current) bodyRef.current.scrollTop = 0
    return {
      paths: sorted,
      matches,
    }
  }, [library.projects, filterState])

  return libOpen ? (
    <LibraryWrapper widthp={widthp}>
      <LibraryHeader>
        <SearchWrapper>
          <SearchInput
            value={searchText}
            onKeyDown={handleKeyDown}
            onChange={handleSearchChange}
            placeholder="filter by name"
          />
          <Icon asButton onClick={handleSearchClear} scale={1.3} name="close-thin" />
        </SearchWrapper>
      </LibraryHeader>
      <LibraryBody inRef={bodyRef}>
        {paths.map((path, i) => {
          return (
            i < maxResults && (
              <LibraryProject
                period={filterState.sortPeriod}
                key={path}
                path={path}
                project={library.projects[path]}
                match={matches[path]}
              />
            )
          )
        })}
        {paths.length > maxResults && (
          <LibItem styles={{ justify: 'center' }} onClick={handleIncMaxResults} depth={1}>
            <u>show more...</u>
          </LibItem>
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
