import React, { memo, useRef, useMemo, useState, useCallback } from 'react'
import ctyled, { active } from 'ctyled'
import { useDispatch, useMappedState } from 'redux-react-hook'
import _ from 'lodash'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import { RATE } from 'render/util/audio'

import Icon from 'render/components/icon'

const TrackControlsWrapper = ctyled.div.styles({
  width: 15,
  borderColor: c => c.contrast(-0.2),
  bg: true,
  color: c => c.contrast(-0.1).nudge(0.05),
})

const TrackHandle = ctyled.div
  .attrs({ selected: false })
  .styles({ color: c => c.nudge(0.2), width: 1 }).extend`
  position:absolute;
  left:0;
  height:100%;
  background:${({ color }, { selected }) => (selected ? '#ca5d5dbf' : color.bg + 'ff')};
`

const TrackControlsBody = ctyled.div.styles({
  column: true,
  flex: 1,
  lined: true,
  borderColor: c => c.contrast(-0.2),
}).extend`
  position:absolute;
  right:0;
  height:100%;
  left:${({ size }) => size * 1}px;
`

const TrackTitle = ctyled.div.styles({
  align: 'center',
  color: c => c.nudge(0.1),
  bg: true,
  padd: 1,
  size: s => s * 0.9,
}).extend`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display:block;
  font-weight:bold;
`

const TrackControlsInner = ctyled.div.styles({
  flex: 1,
  padd: 0.8,
  gutter: 0.8,
})

const MSContainer = ctyled.div.styles({
  column: true,
  height: '100%',
  width: 3,
  gutter: 0.8,
})

const ControlsButton = ctyled.div
  .class(active)
  .attrs<{ disabled?: boolean; active?: boolean }>({ disabled: false, active: false })
  .styles({
    flex: 1,
    align: 'center',
    justify: 'center',
    bg: true,
    color: (c, { active }) => (active ? c.nudge(0.4) : c.nudge(0.15)),
    rounded: true,
    hover: true,
    padd: 1,
  }).extendSheet`
    ${(_, { disabled }) =>
      disabled &&
      `
      opacity:0.5;
      pointer-events:none;
    `}
    ${(_, { active }) => active && `text-decoration:underline;`}
  `

const InnerV = ctyled.div.styles({
  flex: 1,
  height: '100%',
  gutter: 0.8,
  column: true,
})

const SpeedWrapper = ctyled.div.styles({
  align: 'center',
  justify: 'center',
  width: '100%',
  flex: 1,
  bg: true,
  color: c => c.contrast(0.1),
  rounded: true,
  gutter: 1,
  border: 1,
  borderColor: c => c.contrast(-0.3),
})

const CuesWrapper = ctyled.div.styles({
  width: '100%',
  flex: 1,
  gutter: 1,
})

const CueLabel = ControlsButton.styles({
  hover: false,
  border: 0,
})

export interface TrackControlsProps {
  trackId: string
}

export default function TrackControls(props: TrackControlsProps) {
  const getMappedState = useCallback(
      (state: Types.State) => ({
        track: state.tracks[props.trackId],
        period: state.playback.period,
        isSolo: Selectors.getTrackIsSolo(state, props.trackId),
      }),
      [props.trackId]
    ),
    { track, period, isSolo } = useMappedState(getMappedState),
    dispatch = useDispatch()

  const hasBounds = track && track.bounds.length,
    barLen = useMemo(() => {
      const currentIndex = _.findIndex(
          track.bounds,
          bound => bound >= track.sample
        ),
        index = Math.max(currentIndex, 1),
        inBound = track.bounds[index] && track.bounds[index - 1]
      return inBound && track.bounds[index] - track.bounds[index - 1]
    }, [track.bounds, track.sample]),
    activeCueIndex = track.cueIndex,
    playing = track.playback.playing,
    hasCues = !!track.cues.length,
    atStart = playing && activeCueIndex === 0,
    atEnd = playing && activeCueIndex === track.cues.length - 1,
    canPrev = atStart || activeCueIndex > 0,
    canNext =
      (hasCues && atEnd) ||
      (activeCueIndex !== -1 && activeCueIndex < track.cues.length - 1)

  return (
    <TrackControlsWrapper>
      <TrackHandle selected={track.selected} />
      <TrackControlsBody>
        <TrackTitle>{track.name}</TrackTitle>
        <TrackControlsInner>
          <InnerV>
            <SpeedWrapper>
              <Icon name="timer" styles={{ size: s => s * 1.2 }} />
              <span>
                {hasBounds ? _.round(60 / (barLen / RATE), 0) + '/m' : '??'} @{' '}
                {track.playback.aperiodic ? '100' : _.round((barLen / period) * 100, 0)}%
              </span>
            </SpeedWrapper>
            <CuesWrapper>
              <ControlsButton
                disabled={!canPrev}
                onClick={() =>
                  dispatch(
                    Actions.applyControl({
                      control: {
                        name: '',
                        position: { x: 0, y: 0 },
                        trackId: props.trackId,
                        type: 'note',
                        cueStep: -1,
                      },
                      value: 127,
                      function: 'note-on',
                    })
                  )
                }
              >
                <Icon name="prev" styles={{ size: s => s * 1.2 }} />
              </ControlsButton>
              <CueLabel disabled={!hasCues}>
                <b>{activeCueIndex === -1 ? 'n/a' : activeCueIndex + 1}</b>
              </CueLabel>
              <ControlsButton
                disabled={!hasCues}
                onClick={() =>
                  dispatch(
                    Actions.applyControl({
                      control: {
                        name: '',
                        position: { x: 0, y: 0 },
                        trackId: props.trackId,
                        type: 'note',
                        cueStep: 1,
                      },
                      value: 127,
                      function: 'note-on',
                    })
                  )
                }
              >
                <Icon
                  name={canNext ? (atEnd ? 'stop' : 'next') : 'play'}
                  styles={{ size: s => s * 1.2 }}
                />
              </ControlsButton>
            </CuesWrapper>
          </InnerV>
          <MSContainer>
            <ControlsButton
              onClick={() =>
                dispatch(
                  Actions.setTrackMuted({
                    trackId: props.trackId,
                    muted: !track.playback.muted,
                  })
                )
              }
              active={track.playback.muted}
            >
              M
            </ControlsButton>
            <ControlsButton
              onClick={() =>
                dispatch(
                  Actions.setTrackSolo({
                    trackId: props.trackId,
                    solo: !isSolo,
                  })
                )
              }
              active={isSolo}
            >
              S
            </ControlsButton>
          </MSContainer>
        </TrackControlsInner>
      </TrackControlsBody>
    </TrackControlsWrapper>
  )
}
