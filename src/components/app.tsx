import React, { useCallback, useMemo, useState } from 'react'
import ctyled from 'ctyled'
import { useMappedState, useDispatch } from 'redux-react-hook'
import { HotKeys } from 'react-hotkeys'
import { palette } from '../styles/theme'
import * as _ from 'lodash'

import Track from './track/track'
import * as Types from '../redux/types'
import * as Actions from '../redux/actions'

import Head from './head'

const Wrapper = ctyled.div.attrs({ lum: 0, contrast: 0 }).styles({
  color: (c, { lum, contrast }) =>
    c
      .as(palette.gray)
      .absLum(0.7)
      .contrast(0),
  size: 12,
  column: true,
  bg: true,
  lined: true
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
  endLine: true,
  flex: 1,
  scroll: true,
})

import Slider from './slider'

const Heh = ctyled.div.styles({ padd: 1, gutter: 1 })

const SliderWrapper = ctyled.div.styles({ flex: 1 })

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

  const [lum, setLum] = useState(0.85),
    [contrast, setContrast] = useState(0.5)

  return (
    <HotKeys keyMap={keyMap} handlers={handlers}>
      <Wrapper lum={lum} contrast={contrast}>
        {/* <Heh>
          <SliderWrapper>
            <Slider throttle={500} value={lum} onChange={setLum} />
          </SliderWrapper>
          <SliderWrapper>
            <Slider value={contrast} onChange={setContrast} />
          </SliderWrapper>
        </Heh> */}
        <Head />
        <Tracks>
          {trackIds.map(trackId => (
            <Track key={trackId} trackId={trackId} />
          ))}
        </Tracks>
      </Wrapper>
    </HotKeys>
  )
}
