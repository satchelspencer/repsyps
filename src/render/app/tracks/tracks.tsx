import React, { useCallback, useRef, useMemo, useState, useEffect, memo } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'
import { SortableContainer, SortableElement } from 'react-sortable-hoc'
import arrayMove from 'array-move'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'

import Track from './track'

const TracksWrapper = SortableContainer(ctyled.div.styles({
  column: true,
  lined: true,
  endLine: true,
  height: '70%',
  flex: 'none',
  scroll: true,
  color: c => c.nudge(0.025),
  bg: true,
}).extendSheet`
  height:100%;
`)

const SceneDivider = ctyled.div
  .class(active)
  .attrs({ selected: false })
  .styles({
    align: 'center',
    justify: 'center',
    bg: true,
    hover: 0.05,
    size: s => s * 1.1,
    padd: 2,
    height: 3,
    color: (c, { selected }) => (selected ? c.nudge(0.15) : c.nudge(0.05)),
  }).extendSheet`
  font-weight:200;
  font-size:${({ size }) => size * 1.8}px !important;
  ${(_, { selected }) => selected && `text-decoration:underline;`}
`

const SortableSceneDivider = SortableElement(SceneDivider)

function getSceneIndex(items: any[], sceneCount: number, itemIndex: number): number {
  const nextSceneIndex =
      items.find((item, index) => typeof item === 'number' && index > itemIndex) ||
      sceneCount,
    sceneIndex = nextSceneIndex - 1

  return sceneIndex
}

function Tracks() {
  const getMappedState = useCallback((state: Types.State) => {
      return {
        scenes: state.scenes,
        trackIds: Selectors.getCurrentScene(state).trackIds,
      }
    }, []),
    { trackIds, scenes } = useMappedState(getMappedState),
    dispatch = useDispatch(),
    wrapperRef = useRef(null),
    [vBounds, setVBounds] = useState<number[]>([0, 0]),
    updateVisible = useCallback(() => {
      const vstart = wrapperRef.current.scrollTop,
        vend = vstart + wrapperRef.current.offsetHeight

      setVBounds([vstart, vend])
    }, []),
    handleScroll = useMemo(() => _.throttle(updateVisible, 100, { leading: false }), [
      trackIds,
    ]),
    handleSelectScene = useCallback(
      sceneIndex => {
        dispatch(Actions.setSceneIndex(sceneIndex))
        dispatch(
          Actions.selectTrackExclusive(
            scenes.list[sceneIndex] && scenes.list[sceneIndex].trackIds[0]
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

  const listItems: (number | string)[] = scenes.list
    .reduce((memo, scene, sceneIndex) => {
      return [...memo, sceneIndex, ...scene.trackIds]
    }, [])
    .slice(1)

  return (
    <TracksWrapper
      axis="y"
      lockAxis="y"
      useDragHandle
      lockToContainerEdges
      onSortEnd={({ oldIndex, newIndex }) => {
        const newItems = arrayMove(listItems, oldIndex, newIndex),
          item = newItems[newIndex],
          oldSceneIndex = getSceneIndex(listItems, scenes.list.length, oldIndex),
          newSceneIndex = getSceneIndex(newItems, scenes.list.length, newIndex)

        dispatch(
          Actions.addTrackToScene({
            trackId: item as string,
            fromSceneIndex: oldSceneIndex,
            toSceneIndex: newSceneIndex,
            trackIndex: newIndex - newItems.indexOf(newSceneIndex) - 1,
          })
        )

        //console.log('ts', oldSceneIndex, newSceneIndex, newSceneOrder)
      }}
      distance={5}
      transitionDuration={0}
      onScroll={handleScroll}
      inRef={wrapperRef}
    >
      <SceneDivider
        onClick={() => handleSelectScene(0)}
        selected={scenes.sceneIndex === 0}
      >
        1
      </SceneDivider>
      {listItems.map((item, index) => {
        if (typeof item === 'string')
          return <Track index={index} vBounds={vBounds} key={item} trackId={item} />
        else
          return (
            <SortableSceneDivider
              selected={scenes.sceneIndex === item}
              index={index}
              onClick={() => handleSelectScene(item)}
              key={item}
            >
              {item + 1}
            </SortableSceneDivider>
          )
      })}
    </TracksWrapper>
  )
}

export default memo(Tracks)
