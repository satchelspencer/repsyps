import React, { useCallback, memo } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import * as Types from 'lib/types'
import * as Actions from 'render/redux/actions'
import Icon from 'render/components/icon'
import Volume from 'render/components/volume'
import { Value } from 'render/components/misc'
import PeriodControl from './period-control'

const HeaderWrapper = ctyled.div.styles({
  bg: true,
  color: c => c.nudge(0.05).contrast(-0.1),
  //lined: true,
  align: 'center',
  gutter: 1,
}).extendSheet`
  height:40px;
  -webkit-app-region: drag;
  padding-left:72px;
`

const ControlsWrapper = ctyled.div.styles({
  gutter: 2,
  align: 'center',
  padd: 2,
  justify: 'space-between',
}).extendSheet`
  width:${({ size }) => size * 25 - 72}px;
`

export const VolumeControl = memo(() => {
  const getMappedState = useCallback((state: Types.State) => {
      return state.playback.volume
    }, []),
    volume = useMappedState(getMappedState),
    dispatch = useDispatch()

  return (
    <Volume
      volume={volume}
      onChange={v => dispatch(Actions.updatePlayback({ volume: v }))}
    />
  )
})

export const Controls = memo(() => {
  const getMappedState = useCallback((state: Types.State) => {
      return { playing: state.playback.playing, time: state.playback.time }
    }, []),
    { playing, time } = useMappedState(getMappedState),
    dispatch = useDispatch()

  return (
    <ControlsWrapper>
      <Icon
        styles={{ size: s => s * 2 }}
        asButton
        name="prev"
        onClick={() => dispatch(Actions.updatePlayback({ time: time + 1 }))}
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
        onClick={() => dispatch(Actions.updatePlayback({ time: time + 1 }))}
      />
      <Icon
        styles={{ size: s => s * 2 }}
        asButton
        name="replay"
        onClick={() => dispatch(Actions.updatePlayback({ time: 0 }))}
      />
      <Value>{Math.floor(time)}</Value>
    </ControlsWrapper>
  )
})

export default function Header() {
  return (
    <HeaderWrapper>
      <Controls />
      <VolumeControl />
      <PeriodControl />
    </HeaderWrapper>
  )
}
