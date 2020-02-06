import React, { useCallback, memo } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import * as Types from 'render/util/types'
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
        onClick={() => dispatch(Actions.updatePlayback({ time: time - 1 }))}
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

export default Playback
