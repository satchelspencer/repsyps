import React, { useCallback, useRef, useMemo, useState, useEffect, memo } from 'react'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'
import { SortableContainer, SortableElement } from 'react-sortable-hoc'
import arrayMove from 'array-move'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import { adder } from 'render/components/control-adder'

import Track from './track'
import Recording from './record'
import Library from './library'

const TrackWrapper = ctyled.div.styles({
  flex: 1,
  lined: true,
}).extendInline`
  overflow:hidden;
`

const TracksListWrapper = ctyled.div.styles({
  flex: 1,
})

const TracksList = SortableContainer(
  ctyled.div.styles({
    column: true,
    lined: true,
    endLine: true,
    scroll: true,
    color: (c) => c.nudge(0.025),
    bg: true,
    flex: 'none',
  }).extendSheet`
    position:absolute;
    top:0;
    left:0;
    width:100%;
    height:100%;
  `
)

const SceneDivider = adder(ctyled.div
  .class(active)
  .attrs({ selected: false })
  .styles({
    align: 'center',
    justify: 'center',
    bg: true,
    hover: 0.05,
    size: (s) => s * 1.1,
    padd: 2,
    height: 2.7,
    color: (c, { selected }) => (selected ? c.nudge(0.15) : c.nudge(0.05)),
  }).extendSheet`
  font-weight:200;
  font-size:${({ size }) => size * 1.8}px !important;
  ${(_, { selected }) => selected && `text-decoration:underline;`}
`)

const SortableSceneDivider = SortableElement(SceneDivider)

function getSceneIndex(items: any[], sceneCount: number, itemIndex: number): number {
  const nextSceneIndex =
      items.find((item, index) => typeof item === 'number' && index > itemIndex) ||
      sceneCount,
    sceneIndex = nextSceneIndex - 1

  return sceneIndex
}

interface SceneHeaderProps {
  relativeSceneIndex: number
  index: number
  item: number
  onSelectScene: (sceneIndex: number) => any
}

const SceneHeader = memo((props: SceneHeaderProps) => {
  const handleClick = useCallback(() => props.onSelectScene(props.item), [
      props.item,
      props.onSelectScene,
    ]),
    selected = !props.relativeSceneIndex,
    params = useMemo(
      () => ({
        relativeSceneIndex: props.relativeSceneIndex,
      }),
      [props.relativeSceneIndex]
    )

  return (
    <SortableSceneDivider
      selected={selected}
      index={props.index}
      onClick={handleClick}
      params={params}
      noSelect={props.relativeSceneIndex > 0 || props.relativeSceneIndex < -1}
    >
      {props.item + 1}
    </SortableSceneDivider>
  )
})

const TrackVert = ctyled.div.styles({
  column: true,
  lined: true,
  flex: 1,
})

function Tracks() {
  const scenes = useSelector((state) => state.live.scenes),
    currentSceneIndex = useSelector((state) => state.live.sceneIndex),
    dispatch = useDispatch(),
    wrapperRef = useRef<HTMLDivElement | null>(null),
    [vBounds, setVBounds] = useState<number[]>([0, 0]),
    updateVisible = useCallback(() => {
      const vstart = wrapperRef.current?.scrollTop ?? 0,
        vend = vstart + (wrapperRef.current?.offsetHeight ?? 0)

      setVBounds([vstart, vend])
    }, []),
    handleScroll = useMemo(() => _.throttle(updateVisible, 100, { leading: false }), [
      scenes,
    ]),
    handleSelectScene = useCallback(
      (sceneIndex) => {
        dispatch(Actions.setSceneIndex(sceneIndex))
        dispatch(
          Actions.selectTrackExclusive(
            scenes[sceneIndex] && scenes[sceneIndex].trackIds[0]
          )
        )
      },
      [scenes]
    )

  useEffect(() => updateVisible(), [wrapperRef.current])

  useEffect(() => {
    window.addEventListener('resize', updateVisible)
    return () => window.removeEventListener('resize', updateVisible)
  }, [])

  const scenesItems: (number | string)[] = scenes
      .reduce((memo, scene, sceneIndex) => {
        return [...memo, sceneIndex, ...scene.trackIds]
      }, [] as (number | string)[])
      .slice(1),
    handleSortEnd = useCallback(
      ({ oldIndex, newIndex }) => {
        const newItems = arrayMove(scenesItems, oldIndex, newIndex),
          item = newItems[newIndex],
          oldSceneIndex = getSceneIndex(scenesItems, scenes.length, oldIndex),
          newSceneIndex = getSceneIndex(newItems, scenes.length, newIndex)

        dispatch(
          Actions.addTrackToScene({
            trackId: item as string,
            fromSceneIndex: oldSceneIndex,
            toSceneIndex: newSceneIndex,
            trackIndex: newIndex - newItems.indexOf(newSceneIndex) - 1,
          })
        )
      },
      [scenesItems, scenes.length]
    ),
    handleSelectFirst = useCallback(() => handleSelectScene(0), [handleSelectScene]),
    firstParams = useMemo(
      () => ({
        relativeSceneIndex: -currentSceneIndex,
      }),
      [currentSceneIndex]
    )

  return (
    <TrackWrapper>
      <TrackVert>
        <TracksListWrapper>
          <TracksList
            axis="y"
            lockAxis="y"
            useDragHandle
            lockToContainerEdges
            onSortEnd={handleSortEnd}
            distance={5}
            transitionDuration={0}
            onScroll={handleScroll}
            inRef={wrapperRef}
          >
            <SceneDivider
              params={firstParams}
              onClick={handleSelectFirst}
              selected={currentSceneIndex === 0}
              noSelect={currentSceneIndex > 1}
            >
              1
            </SceneDivider>
            {scenesItems.map((item, index) => {
              if (typeof item === 'string')
                return (
                  <Track
                    index={index}
                    vBounds={vBounds}
                    key={item}
                    trackId={item}
                    listRef={wrapperRef}
                  />
                )
              else
                return (
                  <SceneHeader
                    key={item}
                    index={index}
                    item={item}
                    relativeSceneIndex={item - currentSceneIndex}
                    onSelectScene={handleSelectScene}
                  />
                )
            })}
          </TracksList>
        </TracksListWrapper>
        <Recording />
      </TrackVert>
      <Library />
    </TrackWrapper>
  )
}

export default memo(Tracks)
