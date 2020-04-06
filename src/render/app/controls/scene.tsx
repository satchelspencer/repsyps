import React, { memo, useCallback } from 'react'
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

const Side = ctyled.div.attrs({ start: true }).styles({
  flex: 1,
  padd: 2,
  align: 'center',
  gutter: 2,
  justify: (_, { start }) => (!start ? 'flex-start' : 'flex-end'),
})

function ScenesContainer() {
  const sceneIndex = useSelector(state => state.live.sceneIndex),
    nextScene = useSelector(Selectors.getNextScene),
    prevScene = useSelector(Selectors.getPrevScene),
    dispatch = useDispatch(),
    canBack = sceneIndex > 0

  const deleteScene = useCallback(() => dispatch(Actions.deleteScene(sceneIndex)), [
      sceneIndex,
    ]),
    createScene = useCallback(() => dispatch(Actions.createScene(sceneIndex + 1)), [
      sceneIndex,
    ]),
    handleBack = useCallback(() => {
      dispatch(Actions.setSceneIndex(sceneIndex - 1))
      dispatch(Actions.selectTrackExclusive(prevScene.trackIds[0]))
    }, [sceneIndex, prevScene]),
    handleNext = useCallback(() => {
      dispatch(Actions.setSceneIndex(sceneIndex + 1))
      dispatch(Actions.selectTrackExclusive(nextScene && nextScene.trackIds[0]))
    }, [sceneIndex, nextScene])

  return (
    <ScenesWrapper>
      <Side start>
        <Icon asButton scale={1.7} onClick={deleteScene} name="remove" />
        <Icon asButton disabled={!canBack} scale={2} onClick={handleBack} name="prev" />
      </Side>
      <SceneNumber>{sceneIndex + 1}</SceneNumber>
      <Side start={false}>
        <Icon asButton disabled={!nextScene} scale={2} onClick={handleNext} name="next" />
        <Icon asButton scale={1.7} onClick={createScene} name="add" />
      </Side>
    </ScenesWrapper>
  )
}

export default memo(ScenesContainer)
