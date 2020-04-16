import React, { memo } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import audio from 'render/util/audio'

import Icon from 'render/components/icon'
import { Value } from 'render/components/misc'

const ControlsWrapper = ctyled.div.attrs({ fixed: false }).styles({
  gutter: 2,
  align: 'center',
  padd: 2,
  justify: 'space-between',
}).extendSheet`
  width:${({ size }, { fixed }) =>
    size * 25 - (fixed ? 144 / window.devicePixelRatio : 0)}px;
`

export interface PlaybackProps {
  fixed: boolean
}

const Playback = memo((props: PlaybackProps) => {
  const playing = useSelector((state) => state.playback.playing),
    time = useSelector((state) => Math.floor(state.timing.time)),
    dispatch = useDispatch()

  return (
    <ControlsWrapper fixed={props.fixed}>
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
        onClick={() => dispatch(Actions.zeroInitValues())}
      />
      <Value>{time}</Value>
    </ControlsWrapper>
  )
})

export default Playback
