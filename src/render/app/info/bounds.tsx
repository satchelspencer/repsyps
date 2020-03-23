import React, { memo, useCallback, useMemo } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'

import { getBuffer } from 'render/util/buffers'
import getImpulses from 'render/util/impulse-detect'
import inferTimeBase from 'render/util/infer-timebase'
import { RATE } from 'render/util/audio'

import Icon from 'render/components/icon'
import { WideButton, SidebarValue, HeaderContent } from 'render/components/misc'
import { useSelection } from 'render/components/selection'
import SidebarItem from 'render/components/item'
import { palette } from 'src/render/components/theme'

const ButtonGroup = ctyled.div.styles({
  gutter: 1,
})

const BoundsButton = WideButton.styles({
  flex: 1,
})

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
  size: s => s * 0.9,
  alignSelf: 'flex-start',
}).extendSheet`
  outline:none;
  border:1px solid ${({ color }, { active }) =>
    active ? 'rgba(255,0,0,0.5)' : color.bq};
  background:${({ color }, { active }) =>
    active ? 'rgba(255,0,0,0.1) !important' : color.bg};
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

const BoundsControl = memo((props: BoundsControlProps) => {
  const { playback, editing, sourceTrackEditing } = useSelector(
      state => state.live.tracks[props.trackId]
    ),
    { bounds, sourceTracks } = useSelector(state => state.sources[props.trackId]),
    channels = getBuffer(props.trackId),
    dispatch = useDispatch(),
    { isSelecting, getSelection } = useSelection<string>('track'),
    impulses = useMemo(() => getImpulses(channels[0], props.trackId), [
      channels,
      props.trackId,
    ]),
    hasTimeBase = !!bounds.length,
    cstart = playback.chunks[0],
    clength = playback.chunks[1],
    inferLR = useCallback(() => {
      if (!clength) return
      dispatch(
        Actions.setSourceBounds({
          sourceId: props.trackId,
          bounds: inferTimeBase(playback.chunks, impulses),
        })
      )
    }, [playback.chunks, impulses]),
    inferLeft = useCallback(() => {
      if (!clength) return
      const endPoint = cstart + clength,
        inferredBounds = inferTimeBase(playback.chunks, impulses).filter(
          bound => bound <= endPoint
        ),
        existingBounds = bounds.filter(bound => bound > endPoint)

      dispatch(
        Actions.setSourceBounds({
          sourceId: props.trackId,
          bounds: _.sortBy([...inferredBounds, ...existingBounds]),
        })
      )
    }, [playback.chunks, bounds, impulses]),
    inferRight = useCallback(() => {
      if (!clength) return
      const startPoint = cstart,
        inferredBounds = inferTimeBase(playback.chunks, impulses).filter(
          bound => bound >= startPoint
        ),
        existingBounds = bounds.filter(bound => bound < startPoint)

      dispatch(
        Actions.setSourceBounds({
          sourceId: props.trackId,
          bounds: _.sortBy([...inferredBounds, ...existingBounds]),
        })
      )
    }, [playback.chunks, bounds, impulses]),
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
        console.log()
        const id = await getSelection()
        if (id)
          dispatch(
            Actions.copyTrackBounds({
              src: id,
              dest: props.trackId,
            })
          )
      }
    }, [isSelecting, getSelection, props.trackId])

  return (
    <SidebarItem
      open={editing}
      onSetOpen={open => {
        dispatch(Actions.editTrack({ trackId: props.trackId, edit: open }))

        if (!open) {
          dispatch(
            Actions.editSourceTrack({ trackId: props.trackId, sourceTrackEditing: null })
          )
          if (bounds && bounds.length)
            dispatch(
              Actions.setTrackPlayback({
                trackId: props.trackId,
                playback: {
                  aperiodic: false,
                },
              })
            )
        } else
          dispatch(
            Actions.setTrackPlayback({
              trackId: props.trackId,
              playback: {
                aperiodic: true,
              },
            })
          )
      }}
      title={
        <>
          <HeaderContent>
            <Icon name="timer" styles={{ size: s => s * 1.2 }} />
            <span>Time Divisions:</span>
            <SidebarValue warn={!hasTimeBase} styles={{ size: s => s * 0.95 }}>
              {hasTimeBase ? _.round(60 / (avgBar / RATE), 0) + '/m' : '??'}
            </SidebarValue>
          </HeaderContent>
          <BoundsButton>{editing ? 'Save' : 'Edit'}</BoundsButton>
        </>
      }
    >
      <ButtonGroup>
        <BoundsButton onClick={handleSelect}>
          <Icon name="eyedropper" />
          <span>{isSelecting ? 'select a track...' : 'select from track'}</span>
        </BoundsButton>
        <BoundsButton
          styles={{ color: c => c.as(palette.red) }}
          onClick={() =>
            dispatch(
              Actions.setSourceBounds({
                sourceId: props.trackId,
                bounds: [],
              })
            )
          }
        >
          <Icon name="close-thin" />
          <span>clear divisions</span>
        </BoundsButton>
      </ButtonGroup>
      <ButtonGroup>
        <BoundsButton disabled={!clength} onClick={inferLeft}>
          <Icon name="cheveron-left" />
          <span>left </span>
        </BoundsButton>
        <BoundsButton disabled={!clength} onClick={inferLR}>
          <Icon name="cheveron-left" />
          <span>infer</span>
          <Icon name="cheveron-right" />
        </BoundsButton>
        <BoundsButton disabled={!clength} onClick={inferRight}>
          <span>right</span>
          <Icon name="cheveron-right" />
        </BoundsButton>
      </ButtonGroup>
      <SourceTracks>
        {Object.keys(playback.sourceTracksParams).map(sourceTrackId => {
          const sourceTrackParams = playback.sourceTracksParams[sourceTrackId]
          return (
            <SourceTrack key={sourceTrackId}>
              <Icon name="shift" styles={{ size: s => s * 1.5 }} />
              <TrackName selected={false}>
                <TrackNameInner>{sourceTracks[sourceTrackId].name}</TrackNameInner>
              </TrackName>
              <OffsetValue
                onClick={() =>
                  dispatch(
                    Actions.editSourceTrack({
                      trackId: props.trackId,
                      sourceTrackEditing:
                        sourceTrackEditing === sourceTrackId ? null : sourceTrackId,
                    })
                  )
                }
                active={sourceTrackEditing === sourceTrackId}
              >
                {getOffsetStr(sourceTrackParams.offset) + 's'}
              </OffsetValue>
            </SourceTrack>
          )
        })}
      </SourceTracks>
    </SidebarItem>
  )
})

export default BoundsControl
