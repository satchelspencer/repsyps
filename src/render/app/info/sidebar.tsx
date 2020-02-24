import React, { useMemo } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useSelector } from 'render/redux/react'
import * as Selectors from 'render/redux/selectors'

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
  const trackId = useSelector(Selectors.getSelectedTrackId),
    track = useSelector(Selectors.getSelectedTrack),
    source = useSelector(state => state.sources[trackId])

  return useMemo(
    () => (
      <SidebarWrapper>
        {!!track && (
          <TrackDetailsWrapper>
            <Title name={source.name} icon="wave" />
            <TrackVolume trackId={trackId} />
            <BoundsControl trackId={trackId} />
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
