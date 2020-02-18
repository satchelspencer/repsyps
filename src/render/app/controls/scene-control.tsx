import React, { useCallback } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'
import ctyled, { inline } from 'ctyled'

import * as Types from 'render/util/types'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'

import Icon from 'render/components/icon'
import Button from 'render/components/button'

const ScenesWrapper = ctyled.div.styles({
  height: 3,
  flex: 'none',
  color: c => c.contrast(-0.1),
  bg: true,
  align: 'center',
  justify: 'center',
  gutter: 3,
}).extendSheet`
  border-top:1px solid ${({ color }) => color.contrast(0.1).bq} !important;
`

const SceneNumber = ctyled.div.class(inline).styles({
  size: s => s * 1.3,
  align: 'center',
  bg: true,
  padd: 0.5,
  color: c => c.contrast(0.4),
  border: 1,
  width: 3,
  justify: 'center',
  borderColor: c => c.contrast(-0.3),
})

export default function ScenesContainer() {
  const getMappedState = useCallback((state: Types.State) => {
      return {
        scenes: state.scenes,
        selected: Object.keys(state.tracks).filter(tid => state.tracks[tid].selected)[0],
      }
    }, []),
    { scenes, selected } = useMappedState(getMappedState),
    dispatch = useDispatch(),
    canBack = scenes.sceneIndex > 0,
    isLast = scenes.sceneIndex === scenes.list.length - 1,
    canForward = (isLast && selected) || scenes.sceneIndex < scenes.list.length - 1

  return (
    <ScenesWrapper>
      <Icon
        asButton
        style={{ opacity: canBack ? 1 : 0.1, pointerEvents: canBack ? 'all' : 'none' }}
        styles={{ size: s => s * 2 }}
        onClick={() => dispatch(Actions.setSceneIndex(scenes.sceneIndex - 1))}
        name="prev"
      />
      <SceneNumber>{scenes.sceneIndex + 1}</SceneNumber>
      <Icon
        asButton
        style={{
          opacity: canForward ? 1 : 0.1,
          pointerEvents: canForward ? 'all' : 'none',
        }}
        styles={{ size: s => s * 2 }}
        onClick={() => {
          if (selected && isLast)
            dispatch(
              Actions.addTrackToScene({
                fromSceneIndex: scenes.sceneIndex,
                toSceneIndex: scenes.sceneIndex + 1,
                trackId: selected,
              })
            )
          dispatch(Actions.setSceneIndex(scenes.sceneIndex + 1))
        }}
        name={isLast ? 'add' : 'next'}
      />
    </ScenesWrapper>
  )
}
