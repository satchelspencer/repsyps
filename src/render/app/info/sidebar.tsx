import React, { useMemo } from 'react'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'

import { useSelector } from 'render/redux/react'
import * as Selectors from 'render/redux/selectors'

import BoundsControl from './bounds'
import SourceTracks from './source-tracks'
import Separate from './separate'
import Cues from './cues'
import Filter from './filter'
import Loop from './loop'
import Sync from './sync'
import TrackVolume from './volume'

const SidebarWrapper = ctyled.div.styles({
  column: true,
  bg: true,
  color: (c) => c.nudge(-0.05),
  lined: true,
  scroll: true,
}).extendSheet`
  width:${({ size }) => size * 25}px;
`

const TrackDetailsWrapper = ctyled.div.attrs({ disabled: false }).styles({
  column: true,
  padd: true,
  gutter: 2,
  disabled: (_, { disabled }) => disabled,
})

const Sidebar = () => {
  const trackId = useSelector(Selectors.getSelectedTrackId),
    track = useSelector(Selectors.getSelectedTrack),
    source = useSelector((state) => state.sources[trackId]),
    isLoaded = useSelector((state) => Selectors.getTrackIsLoaded(state, trackId))

  return useMemo(
    () => (
      <SidebarWrapper>
        {!!track && (
          <>
            <TrackDetailsWrapper disabled={!isLoaded}>
              <SourceTracks trackId={trackId} />
              <TrackVolume trackId={trackId} />
              <Filter trackId={trackId} />
              <BoundsControl trackId={trackId} />
              <Sync trackId={trackId} />
              <Loop trackId={trackId} />
              <Separate trackId={trackId} />
              <Cues trackId={trackId} />
            </TrackDetailsWrapper>
          </>
        )}
      </SidebarWrapper>
    ),
    [trackId, source, isLoaded]
  )
}

export default Sidebar
