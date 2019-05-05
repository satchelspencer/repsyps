import React, { useCallback, useMemo } from 'react'
import ctyled from 'ctyled'
import { useMappedState, useDispatch } from 'redux-react-hook'
import { HotKeys } from 'react-hotkeys'
import { palette } from '../styles/theme'

import Waveform from './waveform'
import * as Types from '../redux/types'
import * as Actions from '../redux/actions'

const Wrapper = ctyled.div.styles({
  color: c => c.as(palette.gray).absLum(0.9).contrast(0.15),
  size: 12,
  column: true,
  bg: true,
  lined: true,
  endLine: true
}).extend`
    width:100%;
    height:100%;
    top:0;
    left:0;
    position:absolute;
  `

export default function() {
  const getMappedState = useCallback((state: Types.AppState) => state.tracks, []),
    tracks = useMappedState(getMappedState),
    dispatch = useDispatch(),
    keyMap = useMemo(
      () => ({
        playPause: 'space',
      }),
      []
    ),
    handlers = useMemo(
      () => ({
        playPause: () => dispatch(Actions.togglePlayback({})),
      }),
      []
    )

  return (
    <HotKeys keyMap={keyMap} handlers={handlers}>
      <Wrapper>
        {Object.keys(tracks).map(trackId => {
          const track = tracks[trackId]
          return <Waveform key={trackId} track={track} />
        })}
      </Wrapper>
    </HotKeys>
  )
}
