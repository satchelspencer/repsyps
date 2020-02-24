import React, {  memo } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'

import Icon from 'render/components/icon'
import { Value } from 'render/components/misc'
import { isMac } from 'render/util/env'

const ControlsWrapper = ctyled.div.styles({
  gutter: 2,
  align: 'center',
  padd: 2,
  justify: 'space-between',
}).extendSheet`
  width:${({ size }) => size * 25 - (isMac ? 72 : 0)}px;
`

const Playback = memo(() => {
  const playing = useSelector(state => state.playback.playing),
    time = useSelector(state => Math.floor(state.timing.time)),
    dispatch = useDispatch()

  return (
    <ControlsWrapper>
      <Icon
        styles={{ size: s => s * 2 }}
        asButton
        name="prev"
        onClick={() => dispatch(Actions.updatePlaybackTime(-1))}
      />
      <Icon
        styles={{ size: s => s * 2 }}
        asButton
        name={playing ? 'pause' : 'play'}
        onClick={() => dispatch(Actions.updatePlayback({ playing: !playing }))}
      />
      <Icon
        styles={{ size: s => s * 2 }}
        asButton
        name="next"
        onClick={() => dispatch(Actions.updatePlaybackTime(+11))}
      />
      <Icon
        styles={{ size: s => s * 2 }}
        asButton
        name="replay"
        onClick={() => dispatch(Actions.resetPlaybackTime({}))}
      />
      <Value>{time}</Value>
    </ControlsWrapper>
  )
})

export default Playback
