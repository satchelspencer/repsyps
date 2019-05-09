import React, { useCallback, useMemo } from 'react'
import ctyled from 'ctyled'
import { useMappedState, useDispatch } from 'redux-react-hook'
import { HotKeys } from 'react-hotkeys'
import { palette } from '../styles/theme'
import * as _ from 'lodash'

import Waveform from './waveform'
import * as Types from '../redux/types'
import * as Actions from '../redux/actions'
import FracIn from './frac-indicator'

const Wrapper = ctyled.div.styles({
  color: c =>
    c
      .as(palette.gray)
      .absLum(0.9)
      .contrast(0.15),
  size: 12,
  column: true,
  bg: true,
  lined: true,
  endLine: true,
}).extend`
    width:100%;
    height:100%;
    top:0;
    left:0;
    position:absolute;
  `

export default function() {
  const getMappedState = useCallback(
      (state: Types.AppState) => ({ tracks: state.tracks, length: state.mix.length }),
      []
    ),
    { tracks, length } = useMappedState(getMappedState),
    dispatch = useDispatch(),
    keyMap = useMemo(
      () => ({
        playPause: 'shift+space',
        playPauseTrack: 'space',
      }),
      []
    ),
    handlers = useMemo(
      () => ({
        playPause: () => dispatch(Actions.togglePlayback({})),
        playPauseTrack: () => {
          const selected = _.find(_.keys(tracks), tid => tracks[tid].selected)
          dispatch(Actions.toggleTrack(selected))
        },
      }),
      [tracks]
    )

  return (
    <HotKeys keyMap={keyMap} handlers={handlers}>
      <Wrapper>
        <input
          type="range"
          min="0"
          max="5"
          step="0.02"
          value={length / 44100}
          onChange={e => {
            dispatch(
              Actions.updateMixState({
                length: parseFloat(e.target.value) * 44100,
              })
            )
          }}
        />
        {/* <FracIn/> */}
        {Object.keys(tracks).map(trackId => {
          const track = tracks[trackId]
          return <Waveform key={trackId} track={track} trackId={trackId} />
        })}
      </Wrapper>
    </HotKeys>
  )
}
