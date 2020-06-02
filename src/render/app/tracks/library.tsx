import React, { useCallback, useContext, useMemo, useState, useEffect, memo } from 'react'
import * as _ from 'lodash'
import ctyled, { CtyledContext, active, inline } from 'ctyled'
import * as pathUtils from 'path'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import * as Types from 'render/util/types'
import { getPath } from 'render/loading/app-paths'

import ResizableBorder from 'render/components/rborder'
import Icon from 'render/components/icon'

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
  .attrs({ depth: 0 })
  .styles({
    height: 2.25,
    align: 'center',
    bg: true,
    gutter: 1,
    hover: 0.3,
    color: (c, { depth }) => c.nudge(-0.05 - depth * 0.07),
  }).extend`
  padding-left:${({ size }, { depth }) => size / 2 + (size / 2) * depth}px;
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
})

export interface LibraryProjectProps {
  project: Types.LibraryProject
  path: string
  period: number
}

const getRatioStr = (ratio: number): string => {
  if (ratio === 0) return '+0.0'
  else {
    const rounded = _.round(ratio, 1)
    return (rounded > 0 ? '+' : '') + rounded
  }
}

const LibraryProject = memo((props: LibraryProjectProps) => {
  const hasMultipleTracks = _.keys(props.project.tracks).length > 1,
    hasMultipleScenes = props.project.scenes.length > 1,
    root = getPath('library'),
    projectName = pathUtils.relative(root, props.path).replace(/\.syp$/g, ''),
    [open, setOpen] = useState(false),
    handleToggleOpen = useCallback(() => {
      setOpen(!open)
    }, [open])

  return (
    <>
      {hasMultipleTracks && (
        <LibItem depth={0} onClick={handleToggleOpen}>
          <ItemName name={projectName} />
          <Icon name={open ? 'caret-down' : 'caret-right'} scale={1.2} />
        </LibItem>
      )}
      {(!hasMultipleTracks || open) &&
        _.map(props.project.scenes, (scene, sceneIndex) => {
          const sceneHasMultiple = scene.trackIds.length > 1,
            trackDepth =
              (sceneHasMultiple && hasMultipleScenes ? 1 : 0) +
              (hasMultipleTracks ? 1 : 0)
          return (
            <React.Fragment key={sceneIndex}>
              {hasMultipleScenes && sceneHasMultiple && (
                <LibItem depth={1}>
                  <ItemName name={'Scene ' + (sceneIndex + 1)} />
                </LibItem>
              )}
              {scene.trackIds.map((trackId) => {
                const track = props.project.tracks[trackId],
                  ratio = (track.avgPeriod / props.period - 1) * 100
                return (
                  <LibItem depth={trackDepth} key={trackId}>
                    <ItemName
                      name={
                        (sceneHasMultiple || !hasMultipleTracks
                          ? ''
                          : 'Scene ' + (sceneIndex + 1) + ': ') +
                        (hasMultipleTracks ? track.name : projectName)
                      }
                    />
                    <TempoDelta>{getRatioStr(ratio)}%</TempoDelta>
                  </LibItem>
                )
              })}
            </React.Fragment>
          )
        })}
    </>
  )
})

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
    handleSearchClear = useCallback(() => setSearchText(''), [])

  const paths = _.keys(library.projects)

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
      <LibraryBody>
        {paths.map((path) => {
          return (
            <LibraryProject
              period={period}
              key={path}
              path={path}
              project={library.projects[path]}
            />
          )
        })}
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
