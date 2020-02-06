import React, { useCallback, useMemo } from 'react'
import { useMappedState } from 'redux-react-hook'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import * as Types from 'render/util/types'

import Title from './title'
import BoundsControl from './bounds'
import TrackVolume from './track-volume'
import Separate from './separate'
import Cues from './cues'

const SidebarWrapper = ctyled.div.styles({
  column: true,
  bg: true,
  color: c => c.nudge(-0.05),
  lined: true,
}).extendSheet`
  width:${({ size }) => size * 25}px;
`

const TrackDetailsWrapper = ctyled.div.styles({
  column: true,
  padd: true,
  gutter: 2,
})

const Sidebar = () => {
  const getMappedState = useCallback((state: Types.State) => {
      const selectedId = Object.keys(state.tracks).filter(
          tid => state.tracks[tid].selected
        )[0],
        track = selectedId && state.tracks[selectedId]
      return {
        trackId: selectedId,
        trackExists: !!track,
        name: track && track.name,
      }
    }, []),
    { trackId, trackExists, name } = useMappedState(getMappedState)

  return useMemo(
    () => (
      <SidebarWrapper>
        {trackExists && (
          <TrackDetailsWrapper>
            <Title name={name} icon="wave" />
            <TrackVolume trackId={trackId} />
            <BoundsControl trackId={trackId} />
            <Separate trackId={trackId} />
            <Cues trackId={trackId} />
          </TrackDetailsWrapper>
        )}
      </SidebarWrapper>
    ),
    [trackId, trackExists, name]
  )
}

export default Sidebar
