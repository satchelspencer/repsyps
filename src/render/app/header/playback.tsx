import React, { memo } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import audio from 'render/util/audio'

import Icon from 'render/components/icon'
import { Value } from 'render/components/misc'
import { isMac } from 'render/util/env'
import { useTiming } from 'render/components/timing'
import { resetTiming } from 'render/components/timing'

const ControlsWrapper = ctyled.div.styles({
  gutter: 2,
  align: 'center',
  padd: 2,
  justify: 'space-between',
}).extendSheet`
  width:${({ size }) => size * 25 - (isMac ? 144 / window.devicePixelRatio : 0)}px;
`

const Playback = memo(() => {
  const playing = useSelector((state) => state.playback.playing),
    time = Math.floor(useTiming().time),
    dispatch = useDispatch()

  return (
    <ControlsWrapper>
      <Icon scale={2} asButton name="prev" onClick={() => audio.updateTime(-1, true)} />
      <Icon
        scale={2}
        asButton
        name={playing ? 'pause' : 'play'}
        onClick={() => dispatch(Actions.updatePlayback({ playing: !playing }))}
      />
      <Icon scale={2} asButton name="next" onClick={() => audio.updateTime(1, true)} />
      <Icon
        scale={2}
        asButton
        name="replay"
        onClick={() => {
          dispatch(Actions.zeroInitValues())
          resetTiming()
        }}
      />
      <Value>{time}</Value>
    </ControlsWrapper>
  )
})

export default Playback
