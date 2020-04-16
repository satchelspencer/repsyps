import React, { memo, useMemo, useCallback, useState, useContext } from 'react'
import * as _ from 'lodash'
import ctyled, { CtyledContext } from 'ctyled'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'

import BoundsControl from './bounds'
import SourceTracks from './source-tracks'
import Separate from './separate'
import Cues from './cues'
import Filter from './filter'
import Loop from './loop'
import Sync from './sync'
import TrackVolume from './volume'
import ResizableBorder from 'render/components/rborder'

const SidebarWrapper = ctyled.div.attrs({ widthp: 25 }).styles({
  column: true,
  bg: true,
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

const clip = (size: number) => Math.min(Math.max(size, 25.5), 35)

function Sidebar() {
  const trackId = useSelector(Selectors.getSelectedTrackId),
    track = useSelector(Selectors.getSelectedTrack),
    source = useSelector((state) => state.sources[trackId]),
    isLoaded = useSelector((state) => Selectors.getTrackIsLoaded(state, trackId)),
    size = useContext(CtyledContext).theme.size,
    sideBarSize = useSelector((state) => state.settings.sidebarSize),
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
    )

  return useMemo(
    () => (
      <SidebarWrapper widthp={clip(sideBarSize + offset)}>
        <SidebarScroller>
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
        </SidebarScroller>
        <ResizableBorder
          onMove={handleMove}
          onCommit={handleCommit}
          vertical={false}
          start={false}
        />
      </SidebarWrapper>
    ),
    [trackId, source, isLoaded, sideBarSize, offset]
  )
}

export default memo(Sidebar)
