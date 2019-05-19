import React, { memo, useRef, useMemo, useState, useCallback } from 'react'
import ctyled, { active } from 'ctyled'
import { useDispatch, useMappedState } from 'redux-react-hook'
import _ from 'lodash'

import getImpulses from '../dsp/impulse-detect'
import useWaveformCanvas from './waveform-canvas'
import * as Types from '../redux/types'
import * as Actions from '../redux/actions'
import { getContainerPosition, getRelativePos } from './waveform-utils'

import useZoom from './waveform-zoom'

import {
  useDraggableBounds,
  useMeasurePlayback,
  useSelectPlayback,
} from './waveform-mouse'

import WaveformControls from './waveform-controls'

import Button from './button'
import Icon from './icon'

const CornerWrapper = ctyled.div.styles({
  padd: 2,
  gutter: 1,
  align: 'center',
}).extend`
  top:0;
  right:0;
  position:absolute;
`

const TrackName = ctyled.div.styles({
  align: 'center',
  gutter: 1,
  flex: 1,
  padd: 0.7,
  color: c => c.invert(),
  rounded: 2,
}).extendSheet`
  background:${({ color }) => color.bg + '99'};
`

const TrackContainer = ctyled.div.attrs({ selected: false }).styles({
  height: 13,
  flex: 'none',
  color: (c, { selected }) => (selected ? c.nudge(0.1) : c.nudge(0.05)),
})

const TrackCanvas = ctyled.canvas
  .attrs({ selected: false })
  .styles({ color: (c, { selected }) => (selected ? c.nudge(0.1) : c) }).extend`
  position:absolute;
  width:100%;
  height:100%;
  transition:0.3s all;
  ${({ color }, { selected }) =>
    selected && `box-shadow:0 0 5px ${color.fg + '33'} inset;`}
`

const TrackCanvasWrapper = ctyled.div.styles({
  flex: 1,
  bg: true,
  color: c => c.contrast(0.1).nudge(0.1),
})

interface WaveformProps {
  trackId: string
}

export interface ViewContext {
  scale: number
  start: number
  center: number
  impulses: Float32Array
}

export interface DrawViewContext extends ViewContext {
  clickX: number
  width: number
  height: number
}

export interface BoundViewContext extends ViewContext {
  bounds: number[]
}

export interface ClickEventContext {
  clickX: number
  editing: boolean
  selected: boolean
  height: number
  width: number
}

export default memo(function({ trackId }: WaveformProps) {
  //refs
  const container = useRef(null)

  // state
  const [center, setCenter] = useState(0),
    [clickX, setClickX] = useState(null)

  //redux/context
  const getMappedState = useCallback(
      (state: Types.AppState) => ({
        length: state.mix.length,
        track: state.tracks[trackId],
      }),
      [trackId]
    ),
    dispatch = useDispatch(),
    { length, track } = useMappedState(getMappedState)

  // computed data
  const buffer = useMemo(() => track.buffer.getChannelData(1), [track.buffer]),
    impulses = useMemo(() => getImpulses(buffer), [buffer])

  const { left, top, width, height } = getContainerPosition(container)

  /* ZOOM/PANNING CONTROL */
  const { scale, start } = useZoom(container, center)

  const view: ViewContext = {
      scale,
      start,
      center,
      impulses,
    },
    drawView: DrawViewContext = {
      ...view,
      clickX,
      width,
      height,
    },
    boundView: BoundViewContext = {
      ...view,
      bounds: track.bounds,
    },
    boundViewValues = _.values(boundView)

  /* WAVEFORM DRAWING ON CANVAS */
  const { canvasRef } = useWaveformCanvas(drawView, track, buffer)

  const clickCtxt: ClickEventContext = {
      clickX,
      editing: track.editing,
      selected: track.selected,
      height,
      width,
    },
    clickCtxtValues = _.values(clickCtxt)

  const selectMouseUp = useSelectPlayback(trackId),
    measureMouseUp = useMeasurePlayback(trackId),
    dboundsHandlers = useDraggableBounds(trackId)

  /* playback/selection */
  const handleMouseDown = useCallback(
      e => {
        const pos = getRelativePos(e, left, top)
        dboundsHandlers.mouseDown(clickCtxt, pos, boundView)
        setClickX(pos.x)
      },
      [...clickCtxtValues, ...boundViewValues]
    ),
    handleMouseMove = useCallback(
      e => {
        const pos = getRelativePos(e, left, top)
        dboundsHandlers.mouseMove(clickCtxt, pos, boundView, length, track.playback)
        setCenter(pos.x)
      },
      [...clickCtxtValues, ...boundViewValues, length, track.playback]
    ),
    handleMouseUp = useCallback(
      e => {
        const pos = getRelativePos(e, left, top)
        selectMouseUp(clickCtxt, pos, boundView, length)
        measureMouseUp(clickCtxt, pos, boundView, track.alpha, length)
        dboundsHandlers.mouseUp(clickCtxt, pos, boundView)
        setClickX(null)
      },
      [...clickCtxtValues, ...boundViewValues, track.alpha, length]
    ),
    handleClick = useCallback(() => dispatch(Actions.selectTrackExclusive(trackId)), [
      trackId,
    ]),
    rmTrack = useCallback(() => dispatch(Actions.rmTrack(trackId)), [trackId])

  return (
    <TrackContainer selected={track.selected} onClick={handleClick}>
      <WaveformControls
        trackId={trackId}
        track={track}
        impulses={impulses}
        length={length}
      />
      <TrackCanvasWrapper
        inRef={container}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <TrackCanvas
          selected={track.selected}
          inRef={canvasRef}
          width={width * 2}
          height={height * 2}
        />

        <CornerWrapper>
          <TrackName>
            {track.name}&nbsp;
            <Icon
              asButton
              onClick={rmTrack}
              styles={{ size: s => s * 1.1, color: c => c.contrast(0.3) }}
              name="close-thin"
            />
          </TrackName>
        </CornerWrapper>
      </TrackCanvasWrapper>
    </TrackContainer>
  )
})
