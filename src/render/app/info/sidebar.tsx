import React, { memo, useMemo, useCallback, useState, useContext } from 'react'
import * as _ from 'lodash'
import ctyled, { CtyledContext } from 'ctyled'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import { FillMessage } from 'render/components/misc'

import BoundsControl from './bounds'
import SourceTracks from './source-tracks'
import Separate from './separate'
import Cues from './cues'
import Filter from './filter'
import Delay from './delay'
import Loop from './loop'
import Sync from './sync'
import Stretch from './stretch'
import TrackVolume from './volume'
import ResizableBorder from 'render/components/rborder'

const SidebarWrapper = ctyled.div.attrs({ widthp: 25 }).styles({
  column: true,
  bg: true,
  lined: true,
  color: (c) => c.nudge(-0.05),
}).extendSheet`
  width:${({ size }, { widthp }) => size * widthp}px;
`

const SidebarScroller = ctyled.div.styles({
  column: true,
  lined: true,
  scroll: true,
  flex: 1,
  alignSelf: 'stretch',
})

const TrackDetailsWrapper = ctyled.div.attrs({ disabled: false }).styles({
  column: true,
  padd: true,
  gutter: 2,
  disabled: (_, { disabled }) => disabled,
})

const VideoWrapper = ctyled.div.attrs({ heightp: 25 }).styles({
  width: '100%',
  bg: true,
  color: (c) => c.nudge(0.1),
}).extendSheet`
  height:${({ size }, { heightp }) => size * heightp}px;
`

const VIDEO_ASPECT = 4 / 3

const clip = (size: number) => Math.min(Math.max(size, 25.5), 35)

function Sidebar() {
  const trackId = useSelector(Selectors.getSelectedTrackId),
    track = useSelector(Selectors.getSelectedTrack),
    source = useSelector((state) => state.sources[trackId]),
    isLoaded = useSelector((state) => Selectors.getTrackIsLoaded(state, trackId)),
    size = useContext(CtyledContext).theme.size,
    sideBarSize = useSelector((state) => state.settings.sidebarSize),
    screencast = useSelector((state) => state.settings.screencast),
    dispatch = useDispatch(),
    [offset, setOffset] = useState(0),
    handleMove = useCallback(
      (delta) => {
        setOffset(offset + delta / size)
      },
      [size, offset, sideBarSize]
    ),
    handleCommit = useCallback(
      (delta) => {
        setOffset(0)
        dispatch(
          Actions.setSettings({
            sidebarSize: clip(delta / size + offset + sideBarSize),
          })
        )
      },
      [size, offset, sideBarSize]
    ),
    widthp = clip(sideBarSize + offset)

  return useMemo(
    () => (
      <SidebarWrapper widthp={widthp}>
        <SidebarScroller>
          {!!track ? (
            <>
              <TrackDetailsWrapper disabled={!isLoaded}>
                <SourceTracks trackId={trackId} />
                <TrackVolume trackId={trackId} />
                <Filter trackId={trackId} />
                <Delay trackId={trackId} />
                <BoundsControl trackId={trackId} />
                <Sync trackId={trackId} />
                <Stretch trackId={trackId} />
                <Loop trackId={trackId} />
                <Separate trackId={trackId} />
                <Cues trackId={trackId} />
              </TrackDetailsWrapper>
            </>
          ) : (
            <FillMessage>No Track Selected</FillMessage>
          )}
        </SidebarScroller>
        {screencast && <VideoWrapper heightp={widthp / VIDEO_ASPECT} />}
        <ResizableBorder
          onMove={handleMove}
          onCommit={handleCommit}
          vertical={false}
          start={false}
        />
      </SidebarWrapper>
    ),
    [trackId, source, isLoaded, sideBarSize, offset, screencast]
  )
}

export default memo(Sidebar)
