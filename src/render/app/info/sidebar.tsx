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
  const trackId = useSelector(Selectors.getSelectedTrackId),
    track = useSelector(Selectors.getSelectedTrack),
    source = useSelector(state => state.sources[trackId])

  return useMemo(
    () => (
      <SidebarWrapper>
        {!!track && (
          <TrackDetailsWrapper>
            <SourceTracks trackId={trackId} />
            <BoundsControl trackId={trackId} />
            <Alpha trackId={trackId} />
            <Filter trackId={trackId} />
            <Separate trackId={trackId} />
            <Cues trackId={trackId} />
          </TrackDetailsWrapper>
        )}
      </SidebarWrapper>
    ),
    [trackId, source && source.name]
  )
}

export default Sidebar
