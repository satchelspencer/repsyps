import React, { useMemo } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useSelector } from 'render/redux/react'
import * as Selectors from 'render/redux/selectors'

import BoundsControl from './bounds'
import SourceTracks from './source-tracks'
import Separate from './separate'
import Cues from './cues'
import Filter from './filter'
import Alpha from './alpha'
import Sync from './sync'
import TrackVolume from './volume'

const SidebarWrapper = ctyled.div.styles({
  column: true,
  bg: true,
  color: c => c.nudge(-0.05),
  lined: true,
  scroll: true,
}).extendSheet`
  width:${({ size }) => size * 25}px;
`

const TrackDetailsWrapper = ctyled.div.styles({
  column: true,
  padd: true,
  gutter: 2,
})

const Sidebar = () => {
  const trackId = useSelector(Selectors.getSelectedTrackId),
    track = useSelector(Selectors.getSelectedTrack),
    source = useSelector(state => state.sources[trackId]),
    isLoaded = useSelector(state => Selectors.getTrackIsLoaded(state, trackId))

  return useMemo(
    () => (
      <SidebarWrapper
        style={{
          opacity: isLoaded ? 1 : 0.5,
          pointerEvents: isLoaded ? 'all' : 'none',
        }}
      >
        {!!track && (
          <TrackDetailsWrapper>
            <SourceTracks trackId={trackId} />
            <BoundsControl trackId={trackId} />
            <Sync trackId={trackId} />
            <Alpha trackId={trackId} />
            <TrackVolume trackId={trackId} />
            <Filter trackId={trackId} />
            <Separate trackId={trackId} />
            <Cues trackId={trackId} />
          </TrackDetailsWrapper>
        )}
      </SidebarWrapper>
    ),
    [trackId, source && source.name, isLoaded]
  )
}

export default Sidebar
