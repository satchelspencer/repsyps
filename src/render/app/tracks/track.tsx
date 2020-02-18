import React, { memo, useRef, useMemo, useState, useCallback } from 'react'
import ctyled from 'ctyled'
import { useDispatch, useMappedState } from 'redux-react-hook'
import _ from 'lodash'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'

import { getBuffer } from 'render/util/buffers'
import getImpulses from 'render/util/impulse-detect'

import { getContainerPosition, getRelativePos } from './utils'
import { useSelectable } from 'render/components/selection'
import Icon from 'render/components/icon'

import useZoom from './zoom'
import useWaveformCanvas from './canvas'
import {
  useSelectPlayback,
  useResizeBounds,
  useResizePlayback,
  useSelectBound,
  usePlaybackBound,
} from './mouse'
import TrackControls from './track-control'

const TrackWrapper = ctyled.div.attrs({ selected: false }).styles({
  flex: 'none',
  lined: true,
  color: (c, { selected }) => (selected ? c.contrast(0.2) : c.contrast(0.1)),
  borderColor: c => c.contrast(-0.2),
}).extendSheet`
  height:${({ size }) => Math.ceil(size * 8) + 4}px;
`

const TrackCanvasWrapper = ctyled.div.styles({
  flex: 1,
  bg: true,
  color: c => c.contrast(-0.1),
})

const TrackCanvas = ctyled.canvas.attrs({ selected: false }).extend`
  position:absolute;
  width:100%;
  height:100%;
  transition:0.15s all;
`

const CornerWrapper = ctyled.div.styles({
  padd: 0.5,
  gutter: 1,
  align: 'center',
}).extend`
  top:0;
  right:0;
  position:absolute;
`

export interface TrackContainerProps {
  trackId: string
  vBounds: number[]
}

export interface TrackProps {
  trackId: string
  track: Types.Track
  visible: boolean
  noClick: boolean
  sceneIndex: number
}

export interface ViewContext {
  scale: number
  start: number
  center: number
  impulses: Float32Array
  mouseDown: boolean
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

const Track = memo(
  function({ trackId, track, noClick, sceneIndex }: TrackProps) {
    const dispatch = useDispatch()

    /* computed data */
    const buffer = useMemo(() => getBuffer(trackId)[1], [trackId]),
      impulses = useMemo(() => getImpulses(buffer, trackId), [buffer, trackId])

    /* react state */
    const [center, setCenter] = useState(0),
      [clickX, setClickX] = useState(null),
      [shiftKey, setShiftKey] = useState(false),
      [mouseDown, setMouseDown] = useState(false)

    const container = useRef(null)

    const { left, top, width, height } = getContainerPosition(container)

    /* ZOOM/PANNING CONTROL */
    const { scale, start } = useZoom(container, center)

    /* drawing contexts */
    const view: ViewContext = {
        scale,
        start,
        center,
        impulses,
        mouseDown,
      },
      viewValues = _.values(view),
      drawView: DrawViewContext = {
        ...view,
        clickX,
        width,
        height,
      }

    /* click event contexts */
    const clickCtxt: ClickEventContext = {
        clickX,
        editing: track.editing,
        selected: track.selected,
        height,
        width,
      },
      clickCtxtValues = _.values(clickCtxt)

    /* WAVEFORM DRAWING ON CANVAS */
    const { canvasRef } = useWaveformCanvas(drawView, track, buffer, trackId)

    /* mouse event handlers */
    const selectPlaybackHandlers = useSelectPlayback(trackId),
      resizePlaybackHandlers = useResizePlayback(trackId),
      boundHandlers = useResizeBounds(trackId),
      selectBoundHandlers = useSelectBound(trackId),
      playbackBoundHandlers = usePlaybackBound(trackId)

    const handleMouseDown = useCallback(
        e => {
          const pos = getRelativePos(e, left, top)
          resizePlaybackHandlers.mouseDown(clickCtxt, view, pos, track.playback.chunks)
          boundHandlers.mouseDown(clickCtxt, view, pos, track.bounds)
          setClickX(pos.x)
          setMouseDown(true)
          setShiftKey(e.shiftKey)
        },
        [...clickCtxtValues, ...viewValues, track.playback.chunks, track.bounds]
      ),
      handleMouseMove = useCallback(
        e => {
          const pos = getRelativePos(e, left, top)
          boundHandlers.mouseMove(clickCtxt, view, pos, track.bounds)
          resizePlaybackHandlers.mouseMove(clickCtxt, pos, view, track.playback.chunks)
          setCenter(pos.x)
        },
        [...clickCtxtValues, ...viewValues]
      ),
      handleMouseUp = useCallback(
        e => {
          const pos = getRelativePos(e, left, top)

          playbackBoundHandlers.mouseUp(
            clickCtxt,
            pos,
            view,
            track.bounds,
            track.selected
          )

          const didSelectBound = selectBoundHandlers.mouseUp(
              clickCtxt,
              pos,
              view,
              track.bounds
            ),
            didResizeBound = boundHandlers.mouseUp(clickCtxt, pos, view),
            didResizePlayback = resizePlaybackHandlers.mouseUp(clickCtxt, pos, view)

          if (!didSelectBound && !didResizeBound && !didResizePlayback)
            selectPlaybackHandlers.mouseUp(clickCtxt, pos, view)
          setClickX(null)
          setMouseDown(false)
          setShiftKey(false)
        },
        [...clickCtxtValues, ...viewValues, track.bounds, track.selected]
      ),
      handleDoubleClick = useCallback(
        e => {
          const pos = getRelativePos(e, left, top)
          selectBoundHandlers.doubleClick(clickCtxt, pos, view, track.bounds)
        },
        [...clickCtxtValues, ...viewValues, track.bounds]
      ),
      rmTrack = useCallback(
        () => dispatch(Actions.rmTrackFromScene({ trackId, sceneIndex })),
        [trackId, sceneIndex]
      )

    /* styles */
    const delIconSty = useMemo(
      () => ({ size: s => s * 1.1, color: c => c.contrast(0.3) }),
      []
    )

    return (
      <>
        <TrackCanvasWrapper
          inRef={container}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onDoubleClick={handleDoubleClick}
          style={{
            pointerEvents: noClick ? 'none' : 'all',
          }}
        >
          <TrackCanvas
            selected={track.selected}
            inRef={canvasRef}
            width={width * 2}
            height={height * 2}
          />
          <CornerWrapper>
            <Icon asButton onClick={rmTrack} styles={delIconSty} name="close-thin" />
          </CornerWrapper>
        </TrackCanvasWrapper>
      </>
    )
  },
  (prevProps, nextProps) => {
    return (
      !nextProps.visible || //if not visible never update
      (prevProps.track === nextProps.track && prevProps.trackId === nextProps.trackId)
    )
  }
)

const OFFSCREEN_THRESH = 500

export default function TrackContainer(props: TrackContainerProps) {
  const getMappedState = useCallback(
      (state: Types.State) => ({
        track: state.tracks[props.trackId],
        sceneIndex: state.scenes.sceneIndex,
      }),
      [props.trackId]
    ),
    { track, sceneIndex } = useMappedState(getMappedState),
    dispatch = useDispatch(),
    wrapperRef = useRef(null),
    [vstart, vend] = props.vBounds,
    start = wrapperRef.current && wrapperRef.current.offsetTop,
    end = wrapperRef.current && start + wrapperRef.current.offsetHeight,
    visible = !wrapperRef.current || (start < vend && end > vstart),
    wayOffScreen =
      !visible && (start - vend > OFFSCREEN_THRESH || vstart - end > OFFSCREEN_THRESH),
    { isSelecting, onSelect } = useSelectable(),
    handleClick = useCallback(() => {
      if (isSelecting) onSelect(props.trackId)
      else !track.selected && dispatch(Actions.selectTrackExclusive(props.trackId))
    }, [props.trackId, isSelecting, onSelect])

  return (
    <TrackWrapper inRef={wrapperRef} onClick={handleClick} selected={track.selected}>
      {!wayOffScreen && (
        <>
          <TrackControls trackId={props.trackId} />
          <Track
            noClick={isSelecting}
            visible={visible}
            trackId={props.trackId}
            sceneIndex={sceneIndex}
            track={track}
          />
        </>
      )}
    </TrackWrapper>
  )
}
