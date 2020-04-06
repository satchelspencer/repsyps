import React, { memo, useMemo, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'
import pathUtils from 'path'

import * as Types from 'render/util/types'
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

const TrackDetailsWrapper = ctyled.div.attrs({ disabled: false }).styles({
  column: true,
  padd: true,
  gutter: 2,
  disabled: (_, { disabled }) => disabled,
})

const SourceTrackWarningWrapper = ctyled.div.class(active).styles({
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

interface SourceTrackWarningProps {
  sourceTrack: Types.TrackSource
  sourceTrackId: string
  trackId: string
}

const SourceTrackWarning = memo((props: SourceTrackWarningProps) => {
  const store = useStore(),
    handleClick = () => {
      relink(props.trackId, props.sourceTrackId, store)
    } //changes in all cases so no memo

  return (
    props.sourceTrack.missing && (
      <SourceTrackWarningWrapper onClick={handleClick}>
        <Icon name="relink" scale={1.3} />
        <span>
          <b>Missing:</b>
        </span>
        <SourceTrackName>
          <SourceTrackNameInner>
            {props.sourceTrack.source && pathUtils.basename(props.sourceTrack.source)}
          </SourceTrackNameInner>
        </SourceTrackName>
      </SourceTrackWarningWrapper>
    )
  )
})

const Sidebar = () => {
  const trackId = useSelector(Selectors.getSelectedTrackId),
    track = useSelector(Selectors.getSelectedTrack),
    source = useSelector(state => state.sources[trackId]),
    isLoaded = useSelector(state => Selectors.getTrackIsLoaded(state, trackId))

  return useMemo(
    () => (
      <SidebarWrapper>
        {!!track && (
          <>
            {_.keys(source.sourceTracks).map(sourceTrackId => {
              return (
                <SourceTrackWarning
                  sourceTrack={source.sourceTracks[sourceTrackId]}
                  sourceTrackId={sourceTrackId}
                  trackId={trackId}
                  key={sourceTrackId}
                />
              )
            })}
            <TrackDetailsWrapper disabled={!isLoaded}>
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
