import React, {memo} from 'react'
import * as _ from 'lodash'
import ctyled, { inline } from 'ctyled'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'

import Icon from 'render/components/icon'

const ScenesWrapper = ctyled.div.styles({
  height: 3,
  flex: 'none',
  color: c => c.contrast(-0.1),
  bg: true,
  align: 'center',
  justify: 'center',
  gutter: 1,
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

const Side = ctyled.div.styles({
  flex: 1,
  padd: 2,
  align: 'center',
  gutter: 2,
})

function ScenesContainer() {
  const sceneIndex = useSelector(state => state.live.sceneIndex),
    nextScene = useSelector(Selectors.getNextScene),
    prevScene = useSelector(Selectors.getPrevScene),
    dispatch = useDispatch(),
    canBack = sceneIndex > 0

  return (
    <ScenesWrapper>
      <Side styles={{ justify: 'flex-end' }}>
        <Icon
          asButton
          styles={{ size: s => s * 1.7 }}
          onClick={() => {
            dispatch(Actions.deleteScene(sceneIndex))
          }}
          name="remove"
        />
        <Icon
          asButton
          style={{ opacity: canBack ? undefined : 0.1, pointerEvents: canBack ? 'all' : 'none' }}
          styles={{ size: s => s * 2 }}
          onClick={() => {
            dispatch(Actions.setSceneIndex(sceneIndex - 1))
            dispatch(Actions.selectTrackExclusive(prevScene.trackIds[0]))
          }}
          name="prev"
        />
      </Side>
      <SceneNumber>{sceneIndex + 1}</SceneNumber>
      <Side styles={{ justify: 'flex-start' }}>
        <Icon
          asButton
          styles={{ size: s => s * 2 }}
          onClick={() => {
            dispatch(Actions.setSceneIndex(sceneIndex + 1))
            dispatch(Actions.selectTrackExclusive(nextScene && nextScene.trackIds[0]))
          }}
          name="next"
        />
        <Icon
          asButton
          styles={{ size: s => s * 1.7 }}
          onClick={() => {
            dispatch(Actions.createScene(sceneIndex + 1))
          }}
          name="add"
        />
      </Side>
    </ScenesWrapper>
  )
}

export default memo(ScenesContainer)