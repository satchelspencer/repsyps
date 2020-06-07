import React, { memo, useCallback, useMemo } from 'react'
import * as _ from 'lodash'
import ctyled, { inline } from 'ctyled'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import { adder } from 'render/components/control-adder'

import Icon from 'render/components/icon'

const IconWrapper = adder(
  ctyled.div.styles({
    bg: true,
    height: 1.7,
    width: 1.7,
    justify: 'center',
    align: 'center',
    rounded: true,
  })
)

const ScenesWrapper = ctyled.div.styles({
  height: 3,
  flex: 'none',
  color: (c) => c.contrast(-0.1),
  bg: true,
  align: 'center',
  justify: 'center',
  gutter: 1,
}).extendSheet`
  border-top:1px solid ${({ color }) => color.contrast(0.1).bq} !important;
`

const SceneNumber = ctyled.div.class(inline).styles({
  size: (s) => s * 1.3,
  bg: true,
  color: (c) => c.contrast(0.4),
  border: 1,
  width: 7,
  lined: true,
  borderColor: (c) => c.contrast(-0.3),
}).extend`
  overflow:hidden;
`

const NumberInner = ctyled.div.styles({
  height: 1.3,
  bg: true,
  align: 'center',
  justify: 'center',
  flex: 1,
})

const Side = ctyled.div.attrs({ start: true }).styles({
  flex: 1,
  padd: 2,
  align: 'center',
  gutter: 2,
  justify: (_, { start }) => (!start ? 'flex-start' : 'flex-end'),
})

function ScenesContainer() {
  const sceneIndex = useSelector((state) => state.live.sceneIndex),
    currentScene = useSelector(Selectors.getCurrentScene),
    selectedTrackId = useSelector(Selectors.getSelectedTrackId),
    getTrackIndex = useMemo(() => Selectors.makeGetTrackIndex(), []),
    trackIndex = useSelector((state) => getTrackIndex(state, selectedTrackId)),
    dispatch = useDispatch()

  const handleBack = useCallback(() => dispatch(Actions.stepSelectedTrack(-1)), []),
    handleNext = useCallback(() => dispatch(Actions.stepSelectedTrack(1)), []),
    handleBackScene = useCallback(() => dispatch(Actions.stepSceneIndex(-1)), []),
    handleNextScene = useCallback(() => dispatch(Actions.stepSceneIndex(+1)), []),
    params = useMemo(
      () => ({
        prevScene: { sceneStep: -1, invert: true },
        prevTrack: { trackStep: -1, invert: true },
        nextTrack: { trackStep: 1, invert: true },
        nextScene: { sceneStep: 1, invert: true },
      }),
      []
    )

  return (
    <ScenesWrapper>
      <Side start>
        <IconWrapper params={params.prevScene}>
          <Icon asButton scale={1.8} onClick={handleBackScene} name="cheveron-left" />
        </IconWrapper>
        <IconWrapper params={params.prevTrack}>
          <Icon asButton scale={2} onClick={handleBack} name="prev" />
        </IconWrapper>
      </Side>
      <SceneNumber>
        <NumberInner>{sceneIndex + 1}</NumberInner>
        <NumberInner styles={{ color: (c) => c.contrast(-0.2), flex: 1.6 }}>
          {selectedTrackId
            ? `${trackIndex >= 0 ? trackIndex + 1 : trackIndex}/${
                currentScene.trackIds.length
              }`
            : '--'}
        </NumberInner>
      </SceneNumber>
      <Side start={false}>
        <IconWrapper params={params.nextTrack}>
          <Icon asButton scale={2} onClick={handleNext} name="next" />
        </IconWrapper>
        <IconWrapper params={params.nextScene}>
          <Icon asButton scale={1.8} onClick={handleNextScene} name="cheveron-right" />
        </IconWrapper>
      </Side>
    </ScenesWrapper>
  )
}

export default memo(ScenesContainer)
