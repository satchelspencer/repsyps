import React, { memo, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import audio from 'render/util/audio'
import useResetScene from 'render/util/reset-scene'

import Icon from 'render/components/icon'
import { Value } from 'render/components/misc'
import { isMac } from 'render/util/env'
import { useTiming } from 'render/components/timing'


const ControlsWrapper = ctyled.div.styles({
  gutter: 2,
  align: 'center',
  padd: 2,
  justify: 'space-between',
}).extendSheet`
  width:${({ size }) => size * 25 - (isMac ? 72 : 0)}px;
`

const Playback = memo(() => {
  const playing = useSelector((state) => state.playback.playing),
    time = Math.floor(useTiming().time),
    dispatch = useDispatch(),
    handlePrev = useCallback(() => audio.updateTime(-1, true), []),
    handleNext = useCallback(() => audio.updateTime(1, true), []),
    playPause = useCallback(
      () => dispatch(Actions.updatePlayback({ playing: !playing })),
      [playing]
    ),
    handleReset = useResetScene()

  return (
    <ControlsWrapper>
      <Icon scale={2} asButton name="prev" onClick={handlePrev} />
      <Icon scale={2} asButton name={playing ? 'pause' : 'play'} onClick={playPause} />
      <Icon scale={2} asButton name="next" onClick={handleNext} />
      <Icon scale={2} asButton name="replay" onClick={handleReset} />
      <Value>{time}</Value>
    </ControlsWrapper>
  )
})

export default Playback
