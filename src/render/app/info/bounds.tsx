import React, { memo, useCallback, useMemo } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'

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

const PeriodValue = SidebarValue.styles({ size: (s) => s * 0.95 })

const ClearButton = FillButton.styles({ color: (c) => c.as(palette.red) })

const SnapButton = WideButton.attrs({ enabled: false }).extendInline`
  ${(_, { enabled }) => (!enabled ? `opacity:0.4;` : '')}
`

export interface BoundsControlProps {
  trackId: string
}

const BoundsControl = memo((props: BoundsControlProps) => {
  const { playback, editing, sourceTrackEditing, sourceId } = useSelector(
      (state) => state.live.tracks[props.trackId]
    ),
    source = useSelector((state) => (sourceId === null ? null : state.sources[sourceId])),
    bounds = source?.bounds ?? [],
    dispatch = useDispatch(),
    { isSelecting, getSelection } = useSelection<string>('track'),
    snap = useSelector((state) => state.settings.snap),
    hasTimeBase = !!bounds.length,
    clength = playback.chunks[1],
    inferPayload = useMemo(() => (sourceId === null ? null : { sourceId }), [sourceId]),
    inferLR = useCallback(() => {
      inferPayload &&
        dispatch(Actions.inferBounds({ ...inferPayload, direction: 'both' }))
    }, [inferPayload]),
    inferLeft = useCallback(() => {
      inferPayload &&
        dispatch(Actions.inferBounds({ ...inferPayload, direction: 'left' }))
    }, [inferPayload]),
    inferRight = useCallback(() => {
      inferPayload &&
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
        sourceId &&
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
    </SidebarItem>
  )
})

export default BoundsControl
