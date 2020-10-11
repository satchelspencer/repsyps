import React, { memo, useCallback, useMemo, useState } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Types from 'render/util/types'

import { RATE } from 'render/util/audio'

import Icon from 'render/components/icon'
import {
  SidebarValue,
  HeaderContent,
  FillButton,
  WideButton,
  Horizontal,
} from 'render/components/misc'
import { useSelection } from 'render/components/selection'
import SidebarItem from 'render/components/item'
import { palette } from 'src/render/components/theme'
import Alpha from './alpha'

const SourceTracks = ctyled.div.styles({
  column: true,
  gutter: true,
})

const TrackName = ctyled.div.attrs({ selected: false }).styles({
  flex: 1,
  height: 1.3,
})

const TrackNameInner = ctyled.div.styles({}).extendSheet`
  position:absolute;
  width:100%;
  top:0;
  left:0;
  display:block;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
`

const OffsetValue = SidebarValue.attrs({ active: false }).styles({
  width: 'auto',
  size: (s) => s * 0.9,
  alignSelf: 'flex-start',
}).extendSheet`
  outline:none;
  border:1px solid ${({ color }, { active }) =>
    active ? 'rgba(255,0,0,0.5)' : color.bq};
  background:${({ color }, { active }) =>
    active ? 'rgba(255,0,0,0.1) !important' : color.bg};
`

const PeriodValue = SidebarValue.styles({ size: (s) => s * 0.95 })

const ClearButton = FillButton.styles({ color: (c) => c.as(palette.red) })

const SnapButton = WideButton.attrs({ enabled: false }).extend`
  ${(_, { enabled }) => !enabled && `opacity:0.4;`}
`

const SourceTrack = ctyled.div.styles({
  gutter: 1,
  align: 'center',
})

const getOffsetStr = (offset: number): string => {
  if (Math.abs(offset) < 100) offset = 0
  if (offset === 0) return '+0.00'
  else {
    const rounded = _.round(offset / 44100, 2)
    return _.padEnd((rounded > 0 ? '+' : '') + rounded, 5, '0')
  }
}

export interface BoundsControlProps {
  trackId: string
}

interface SourceTrackOffsetProps {
  trackId: string
  sourceTrackId: string
  sourceTrack: Types.TrackSource
  sourceTrackEditing: string
  sourceTrackParams: Types.TrackSourceParams
}

const SourceTrackOffset = memo((props: SourceTrackOffsetProps) => {
  const dispatch = useDispatch(),
    isSelected = props.sourceTrackEditing === props.sourceTrackId,
    toggleEditing = useCallback(
      () =>
        dispatch(
          Actions.editSourceTrack({
            trackId: props.trackId,
            sourceTrackEditing: isSelected ? null : props.sourceTrackId,
          })
        ),
      [isSelected, props.sourceTrackId]
    )
  return (
    <SourceTrack>
      <Icon name="shift" scale={1.5} />
      <TrackName selected={false}>
        <TrackNameInner>{props.sourceTrack.name}</TrackNameInner>
      </TrackName>
      <OffsetValue onClick={toggleEditing} active={isSelected}>
        {getOffsetStr(props.sourceTrackParams.offset) + 's'}
      </OffsetValue>
    </SourceTrack>
  )
})

const BoundsControl = memo((props: BoundsControlProps) => {
  const { playback, editing, sourceTrackEditing, sourceId } = useSelector(
      (state) => state.live.tracks[props.trackId]
    ),
    { bounds, sourceTracks } = useSelector((state) => state.sources[sourceId]),
    dispatch = useDispatch(),
    { isSelecting, getSelection } = useSelection<string>('track'),
    snap = useSelector((state) => state.settings.snap),
    hasTimeBase = !!bounds.length,
    clength = playback.chunks[1],
    inferPayload = useMemo(() => ({ sourceId }), [sourceId]),
    inferLR = useCallback(() => {
      dispatch(Actions.inferBounds({ ...inferPayload, direction: 'both' }))
    }, [inferPayload]),
    inferLeft = useCallback(() => {
      dispatch(Actions.inferBounds({ ...inferPayload, direction: 'left' }))
    }, [inferPayload]),
    inferRight = useCallback(() => {
      dispatch(Actions.inferBounds({ ...inferPayload, direction: 'right' }))
    }, [inferPayload]),
    avgBar = useMemo(() => {
      let sum = 0
      bounds.forEach((bound, i) => {
        const next = bounds[i + 1]
        if (next) sum += next - bound
      })
      return sum / (bounds.length - 1)
    }, [bounds]),
    handleSelect = useCallback(async () => {
      if (!isSelecting) {
        const id = await getSelection()
        if (id)
          dispatch(
            Actions.copyTrackBounds({
              src: id,
              dest: props.trackId,
            })
          )
      }
    }, [isSelecting, getSelection, props.trackId]),
    handleSetOpen = useCallback(
      (open) => dispatch(Actions.editTrack({ trackId: props.trackId, edit: open })),
      [props.trackId, bounds]
    ),
    handleClearBounds = useCallback(
      () =>
        dispatch(
          Actions.setSourceBounds({
            sourceId,
            bounds: [],
          })
        ),
      [props.trackId]
    ),
    handleToggleSnap = useCallback(
      () =>
        dispatch(
          Actions.setSettings({
            snap: !snap,
          })
        ),
      [snap]
    )

  return (
    <SidebarItem
      open={editing}
      onSetOpen={handleSetOpen}
      title={
        <>
          <HeaderContent>
            <Icon name="timer" scale={1.2} />
            <span>Time Grid:</span>
            <PeriodValue warn={!hasTimeBase}>
              {hasTimeBase ? _.round(60 / (avgBar / RATE), 0) + '/m' : '??'}
            </PeriodValue>
          </HeaderContent>
          <FillButton>{editing ? 'Save' : 'Edit'}</FillButton>
        </>
      }
    >
      <Horizontal>
        <FillButton onClick={handleSelect}>
          <Icon name="eyedropper" />
          <span>{isSelecting ? 'select track...' : 'from track'}</span>
        </FillButton>
        <ClearButton onClick={handleClearBounds}>
          <Icon name="close-thin" />
          <span>clear grid</span>
        </ClearButton>
        <SnapButton enabled={snap} onClick={handleToggleSnap}>
          <Icon name="magnet" scale={1.1} />
        </SnapButton>
      </Horizontal>
      <Horizontal>
        <FillButton disabled={!clength} onClick={inferLeft}>
          <Icon name="cheveron-left" />
          <span>left </span>
        </FillButton>
        <FillButton disabled={!clength} onClick={inferLR}>
          <Icon name="cheveron-left" />
          <span>infer</span>
          <Icon name="cheveron-right" />
        </FillButton>
        <FillButton disabled={!clength} onClick={inferRight}>
          <span>right</span>
          <Icon name="cheveron-right" />
        </FillButton>
      </Horizontal>
      <Alpha sourceId={sourceId} />
      <SourceTracks>
        {Object.keys(playback.sourceTracksParams).map((sourceTrackId) => (
          <SourceTrackOffset
            key={sourceTrackId}
            trackId={props.trackId}
            sourceTrackId={sourceTrackId}
            sourceTrackParams={playback.sourceTracksParams[sourceTrackId]}
            sourceTrack={sourceTracks[sourceTrackId]}
            sourceTrackEditing={sourceTrackEditing}
          />
        ))}
      </SourceTracks>
    </SidebarItem>
  )
})

export default BoundsControl
