import React, { useCallback, useMemo } from 'react'
import ctyled from 'ctyled'
import { useMappedState, useDispatch } from 'redux-react-hook'
import { HotKeys } from 'react-hotkeys'
import { palette } from '../styles/theme'
import * as _ from 'lodash'

import Waveform from './waveform'
import * as Types from '../redux/types'
import * as Actions from '../redux/actions'

import Head from './head'

const Wrapper = ctyled.div.styles({
  color: c =>
    c
      .as(palette.gray)
      .absLum(0.9)
      .contrast(0.15),
  size: 12,
  column: true,
  bg: true,
  endLine: true,
  lined: true,
}).extend`
    width:100%;
    height:100%;
    top:0;
    left:0;
    position:absolute;
  `

const Tracks = ctyled.div.styles({
  column: true,
  lined: true,
  flex: 1,
  scroll: true,
})

export default function() {
  const getMappedState = useCallback(
      (state: Types.AppState) => ({
        trackIds: Object.keys(state.tracks),
        selected: Object.keys(state.tracks).filter(tid => state.tracks[tid].selected)[0],
      }),
      []
    ),
    { trackIds, selected } = useMappedState(getMappedState),
    dispatch = useDispatch(),
    keyMap = useMemo(
      () => ({
        playPause: 'shift+space',
        playPauseTrack: 'space',
        nextTrack: 'down',
        prevTrack: 'up',
      }),
      []
    ),
    handlers = useMemo(
      () => ({
        playPause: () => dispatch(Actions.togglePlayback({})),
        playPauseTrack: () => dispatch(Actions.toggleTrack(selected)),
        nextTrack: () => {
          const next =
            trackIds[(trackIds.indexOf(selected) + trackIds.length + 1) % trackIds.length]
          dispatch(Actions.selectTrackExclusive(next))
        },
        prevTrack: () => {
          const prev =
            trackIds[(trackIds.indexOf(selected) + trackIds.length - 1) % trackIds.length]
          dispatch(Actions.selectTrackExclusive(prev))
        },
      }),
      [trackIds, selected]
    )
  return (
    <HotKeys keyMap={keyMap} handlers={handlers}>
      <Wrapper>
        <Head />
        <Tracks>
          {trackIds.map(trackId => {
            return <Waveform key={trackId} trackId={trackId} />
          })}
        </Tracks>
      </Wrapper>
    </HotKeys>
  )
}
