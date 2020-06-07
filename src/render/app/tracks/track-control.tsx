import React, { memo, useMemo, useCallback } from 'react'
import ctyled, { active } from 'ctyled'
import _ from 'lodash'
import { SortableHandle } from 'react-sortable-hoc'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Types from 'render/util/types'
import * as Selectors from 'render/redux/selectors'
import { RATE } from 'render/util/audio'
import { useSelectable } from 'render/components/selection'

import Icon from 'render/components/icon'
import { adder } from 'render/components/control-adder'

const TrackControlsWrapper = ctyled.div.styles({
  width: 15,
  borderColor: (c) => c.contrast(-0.2),
  bg: true,
  color: (c) => c.contrast(-0.1).nudge(0.05),
})

const TrackHandle = SortableHandle(ctyled.div
  .attrs({ selected: false })
  .styles({ color: (c) => c.nudge(0.2), width: 1 }).extend`
  position:absolute;
  left:0;
  height:100%;
  background:${({ color }, { selected }) => (selected ? '#ca5d5dbf' : color.bg + 'ff')};
`)

const TrackControlsBody = ctyled.div.styles({
  column: true,
  flex: 1,
  lined: true,
  borderColor: (c) => c.contrast(-0.2),
}).extend`
  position:absolute;
  right:0;
  height:100%;
  left:${({ size }) => size * 1}px;
`

const TrackHeaderWrapper = ctyled.div.styles({
  size: (s) => s * 0.9,
  lined: true,
})

const TrackHeader = adder(ctyled.div.styles({
  color: (c) => c.nudge(0.1),
  padd: 1,
  flex: 1,
  justify: 'space-between',
  align: 'center',
  gutter: 0.8,
  bg: true,
}).extend`
  padding-right:${({ size }) => size / 1.8}px;
`)

const JogAdder = adder(
  ctyled.div.styles({
    padd: 1,
    align: 'center',
    justify: 'center',
    bg: true,
    size: (s) => s * 1.2,
    color: (c) => c.contrast(-0.3),
  })
)

const TrackTitleWrapper = ctyled.div.styles({
  flex: 1,
  height: 1.3,
})

const TrackTitle = ctyled.div.styles({}).extend`  
  position:absolute;
  top:0;
  left:0;
  width:100%;
  height:100%;
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
}).extendSheet`
  font-size:${({ size }) => size}px !important;
`

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

const ControlsButtonAdder = adder(ControlsButton)

const InnerV = ctyled.div.styles({
  flex: 1,
  height: '100%',
  gutter: 0.8,
  column: true,
})

const SpeedWrapper = ctyled.div.styles({
  align: 'center',
  justify: 'space-around',
  width: '100%',
  flex: 1,
  bg: true,
  color: (c) => c.contrast(0.1),
  rounded: true,
  gutter: 1,
  border: 1,
  borderColor: (c) => c.contrast(-0.3),
}).extendSheet`
  padding:0px ${({ size }) => size / 1.6}px;
  font-size:${({ size }) => size}px !important;
`

const CuesWrapper = ctyled.div.styles({
  width: '100%',
  flex: 1,
  gutter: 1,
})

const TrackIndex = ctyled.div.styles({
  size: (s) => s * 1.2,
}).extend`
  font-weight:bold;
`

const PreviewButton = ControlsButton.styles({
  padd: 0.25,
  flex: 'none',
})

export interface TrackControlsProps {
  trackId: string
}

function TrackControls(props: TrackControlsProps) {
  const getTrackIsSolo = useMemo(() => Selectors.makeGetTrackIsSolo(), []),
    track = useSelector((state) => state.live.tracks[props.trackId]),
    period = useSelector((state) => state.playback.period),
    isSolo = useSelector((state) => getTrackIsSolo(state, props.trackId)),
    source = useSelector((state) => state.sources[props.trackId]),
    hasPreview = useSelector((state) => state.output.preview !== null),
    getTrackIndex = useMemo(() => Selectors.makeGetTrackIndex(), []),
    trackIndex = useSelector((state) => getTrackIndex(state, props.trackId)),
    { isSelecting } = useSelectable<Partial<Types.Control>>('control'),
    dispatch = useDispatch(),
    volumeControlParams = useMemo(
      () => ({
        trackIndex,
        trackProp: 'volume',
      }),
      [trackIndex]
    ),
    jogControlParams = useMemo(
      () => ({
        trackIndex,
        jog: true,
      }),
      [trackIndex]
    ),
    clickControlParams = useMemo(
      () => ({
        trackIndex,
        click: true,
        invert: true,
      }),
      [trackIndex]
    ),
    playPauseParams = useMemo(
      () => ({
        trackIndex,
        playPause: true,
        invert: true,
      }),
      [trackIndex]
    )

  const barLen =
      track.playback.chunkIndex === -1
        ? track.playback.chunks[1]
        : track.playback.chunks[track.playback.chunkIndex * 2 + 1],
    baseSpeed = barLen && !track.playback.aperiodic ? barLen / period : 1,
    activeCueIndex = track.cueIndex,
    playing = track.playback.playing,
    hasCues = !!track.cues.length,
    atStart = playing && activeCueIndex === 0,
    atEnd = playing && activeCueIndex === track.cues.length - 1,
    canPrev = atStart || activeCueIndex > 0,
    boundsAlpha = track.playback.aperiodic ? 1 : source.boundsAlpha

  const handlePrevCue = useCallback(
      () =>
        dispatch(
          Actions.stepTrackCue({
            trackId: props.trackId,
            cueStep: -1,
          })
        ),
      [props.trackId]
    ),
    handleForward = useCallback(() => {
      if (hasCues)
        dispatch(
          Actions.stepTrackCue({
            trackId: props.trackId,
            cueStep: 1,
          })
        )
    }, [props.trackId]),
    handlePlayPause = useCallback(() => {
      dispatch(
        Actions.setTrackPlayback({
          trackId: props.trackId,
          playback: {
            playing: !track.playback.playing,
          },
        })
      )
    }, [props.trackId, track.playback.playing]),
    handleMute = useCallback(
      () =>
        dispatch(
          Actions.setTrackMuted({
            trackId: props.trackId,
            muted: !track.playback.muted,
          })
        ),
      [props.trackId, track.playback.muted]
    ),
    handleSolo = useCallback(
      () =>
        dispatch(
          Actions.setTrackSolo({
            trackId: props.trackId,
            solo: !isSolo,
          })
        ),
      [props.trackId, isSolo]
    ),
    handlePreview = useCallback(() => {
      dispatch(
        Actions.setTrackPlayback({
          trackId: props.trackId,
          playback: {
            preview: !track.playback.preview,
          },
        })
      )
    }, [props.trackId, track.playback.preview])

  return (
    <TrackControlsWrapper>
      <TrackHandle selected={track.selected} />
      <TrackControlsBody>
        <TrackHeaderWrapper>
          <TrackHeader params={volumeControlParams}>
            <TrackTitleWrapper>
              <TrackTitle>{source.name}</TrackTitle>
            </TrackTitleWrapper>
            {!isSelecting && (
              <PreviewButton disabled={!hasPreview} onClick={handlePreview}>
                <Icon
                  scale={1.2}
                  name={track.playback.preview ? 'headphones' : 'headphones-off'}
                  asButton
                />
              </PreviewButton>
            )}
          </TrackHeader>
          <JogAdder params={jogControlParams} hideWhenInactive={true}>
            <Icon name="jog" />
          </JogAdder>
          <JogAdder params={clickControlParams} hideWhenInactive={true}>
            <Icon name="immediate" />
          </JogAdder>
        </TrackHeaderWrapper>
        <TrackControlsInner>
          <InnerV>
            <SpeedWrapper>
              <TrackIndex>{trackIndex < 0 ? '-' : trackIndex + 1}</TrackIndex>
              <span>
                {barLen > 0 ? _.round(60 / (barLen / RATE), 0) + '/m' : '??'} @{' '}
                {_.round(baseSpeed * track.playback.alpha * boundsAlpha * 100, 0)}%
              </span>
            </SpeedWrapper>
            <CuesWrapper>
              <ControlsButton disabled={!canPrev} onClick={handlePrevCue}>
                <Icon name="prev" scale={1.2} />
              </ControlsButton>
              <ControlsButtonAdder params={playPauseParams} onClick={handlePlayPause}>
                <Icon name={track.playback.playing ? 'pause' : 'play'} scale={1.2} />
              </ControlsButtonAdder>
              <ControlsButton disabled={!hasCues} onClick={handleForward}>
                <Icon name={atEnd ? 'stop' : 'next'} scale={1.2} />
              </ControlsButton>
            </CuesWrapper>
          </InnerV>
          <MSContainer>
            <ControlsButton onClick={handleMute} active={track.playback.muted}>
              M
            </ControlsButton>
            <ControlsButton onClick={handleSolo} active={isSolo}>
              S
            </ControlsButton>
          </MSContainer>
        </TrackControlsInner>
      </TrackControlsBody>
    </TrackControlsWrapper>
  )
}

export default memo(TrackControls)
