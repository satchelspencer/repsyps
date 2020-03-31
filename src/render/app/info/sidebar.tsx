import React, { useMemo } from 'react'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'
import pathUtils from 'path'

import { useSelector, useStore } from 'render/redux/react'
import * as Selectors from 'render/redux/selectors'
import relink from 'render/util/relink'

import BoundsControl from './bounds'
import SourceTracks from './source-tracks'
import Separate from './separate'
import Cues from './cues'
import Filter from './filter'
import Alpha from './alpha'
import Sync from './sync'
import TrackVolume from './volume'
import { palette } from 'render/components/theme'
import Icon from 'render/components/icon'

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

const SourceTrackWarning = ctyled.div.class(active).styles({
  padd: 1,
  align: 'center',
  hover: true,
  bg: true,
  color: c => c.as(palette.primary_red),
  gutter: 1,
})

const SourceTrackName = ctyled.div.styles({
  height: 1.2,
  flex: 1,
})
const SourceTrackNameInner = ctyled.div.extendSheet`
  position:absolute;
  top:0;
  left:0;
  width:100%;
  height:100%;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
  display:block;
`

const Sidebar = () => {
  const trackId = useSelector(Selectors.getSelectedTrackId),
    track = useSelector(Selectors.getSelectedTrack),
    source = useSelector(state => state.sources[trackId]),
    isLoaded = useSelector(state => Selectors.getTrackIsLoaded(state, trackId)),
    store = useStore()

  return useMemo(
    () => (
      <SidebarWrapper>
        {!!track && (
          <>
            {_.keys(source.sourceTracks).map(sourceTrackId => {
              const sourceTrack = source.sourceTracks[sourceTrackId]
              return (
                sourceTrack.missing && (
                  <SourceTrackWarning
                    key={sourceTrackId}
                    onClick={() => {
                      relink(trackId, sourceTrackId, store)
                    }}
                  >
                    <Icon name="relink" styles={{ size: s => s * 1.3 }} />
                    <span>
                      <b>Missing:</b>
                    </span>
                    <SourceTrackName>
                      <SourceTrackNameInner>
                        {pathUtils.basename(sourceTrack.source)}
                      </SourceTrackNameInner>
                    </SourceTrackName>
                  </SourceTrackWarning>
                )
              )
            })}
            <TrackDetailsWrapper
              style={{
                opacity: isLoaded ? 1 : 0.5,
                pointerEvents: isLoaded ? 'all' : 'none',
              }}
            >
              <SourceTracks trackId={trackId} />
              <BoundsControl trackId={trackId} />
              <Sync trackId={trackId} />
              <Alpha trackId={trackId} />
              <TrackVolume trackId={trackId} />
              <Filter trackId={trackId} />
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
