import React, { useCallback } from 'react'
import ctyled from 'ctyled'
import { useMappedState } from 'redux-react-hook'

import Waveform from './waveform'
import * as Types from '../redux/types'

const Wrapper = ctyled.div.styles({ column: true }).extend`
    width:100%;
    height:100%;
    top:0;
    left:0;
    position:absolute;
  `

export default function() {
  const getMappedState = useCallback((state: Types.AppState) => state.tracks, [])
  const tracks = useMappedState(getMappedState)
  return <Wrapper>
    {Object.keys(tracks).map(trackId => {
      const track = tracks[trackId]
      return <Waveform key={trackId} track={track}/>
    })}
  </Wrapper>
}
