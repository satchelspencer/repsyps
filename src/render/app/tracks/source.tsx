import React, { memo, useRef, useMemo, useState, useCallback } from 'react'
import ctyled from 'ctyled'
import { useDispatch, useMappedState } from 'redux-react-hook'
import _ from 'lodash'

import * as Types from 'lib/types'
import Icon from 'render/components/icon'
import { getContainerPosition, getRelativePos, capture } from './utils'
import * as Actions from 'render/redux/actions'
import getImpulses from 'lib/impulse-detect'

import useZoom from './zoom'
import useWaveformCanvas from './canvas'
import {
  useSelectPlayback,
  useResizeBounds,
  useResizePlayback,
  useSelectBound,
  usePlaybackBound,
} from './mouse'

const TrackContainer = ctyled.div.attrs({ selected: false }).styles({
  flex: 'none',
  color: (c, { selected }) => (selected ? c.contrast(0.3) : c),
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

const TrackArrow = ctyled.div.styles({
  width: 1.5,
  height: 1.5,
}).extendSheet`
  position:absolute;
  top:50%;
  left:0%; 
  background:rgb(237, 235, 235);
  border: 1px solid #c1bfbf;
  margin-top:-${({ size }) => Math.round(size * 0.75)}px;
  margin-left:-${({ size }) => Math.round(size * 0.75) + 1}px;
  transform-origin:50% 50%;
  transform:rotate(45deg);
  clip-path: polygon(0 0, 100% 0, 100% 100%);
`

export interface SourceProps {
  sourceId: string
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

export default memo(function({ sourceId }: SourceProps) {
  /* redux state */
  const getMappedState = useCallback(
      (state: Types.State) => ({
        period: state.playback.period,
        source: state.sources[sourceId],
      }),
      [sourceId]
    ),
    dispatch = useDispatch(),
    { period, source } = useMappedState(getMappedState)

  /* computed data */
  const buffer = useMemo(() => source.channels.getChannelData(1), [source.channels]),
    impulses = useMemo(() => getImpulses(buffer, sourceId), [buffer, sourceId])

  /* react state */
  const [center, setCenter] = useState(0),
    [clickX, setClickX] = useState(null),
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
      mouseDown
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
      editing: source.editing,
      selected: source.selected,
      height,
      width,
    },
    clickCtxtValues = _.values(clickCtxt)

  /* WAVEFORM DRAWING ON CANVAS */
  const { canvasRef } = useWaveformCanvas(drawView, source, buffer)

  /* mouse event handlers */
  const selectPlaybackHandlers = useSelectPlayback(sourceId),
    resizePlaybackHandlers = useResizePlayback(sourceId),
    boundHandlers = useResizeBounds(sourceId),
    selectBoundHandlers = useSelectBound(sourceId),
    playbackBoundHandlers = usePlaybackBound(sourceId)

  const handleMouseDown = useCallback(
      e => {
        const pos = getRelativePos(e, left, top)
        resizePlaybackHandlers.mouseDown(clickCtxt, view, pos, source.playback.chunks)
        boundHandlers.mouseDown(clickCtxt, view, pos, source.bounds)
        setClickX(pos.x)
        setMouseDown(true)
      },
      [...clickCtxtValues, ...viewValues, source.playback.chunks, source.bounds]
    ),
    handleMouseMove = useCallback(
      e => {
        const pos = getRelativePos(e, left, top)
        boundHandlers.mouseMove(clickCtxt, view, pos, source.bounds)
        resizePlaybackHandlers.mouseMove(clickCtxt, pos, view, source.playback.chunks)
        setCenter(pos.x)
      },
      [...clickCtxtValues, ...viewValues]
    ),
    handleMouseUp = useCallback(
      e => {
        const pos = getRelativePos(e, left, top)

        playbackBoundHandlers.mouseUp(clickCtxt, pos, view, source.bounds)

        const didSelectBound = selectBoundHandlers.mouseUp(
            clickCtxt,
            pos,
            view,
            source.bounds
          ),
          didResizeBound = boundHandlers.mouseUp(clickCtxt, pos, view),
          didResizePlayback = resizePlaybackHandlers.mouseUp(clickCtxt, pos, view)

        if (!didSelectBound && !didResizeBound && !didResizePlayback)
          selectPlaybackHandlers.mouseUp(clickCtxt, pos, view)
        setClickX(null)
        setMouseDown(false)
      },
      [...clickCtxtValues, ...viewValues, source.bounds]
    ),
    handleDoubleClick = useCallback(
      e => {
        const pos = getRelativePos(e, left, top)
        selectBoundHandlers.doubleClick(clickCtxt, pos, view, source.bounds)
      },
      [...clickCtxtValues, ...viewValues, source.bounds]
    ),
    handleClick = useCallback(
      () => !source.selected && dispatch(Actions.selectSourceExclusive(sourceId)),
      [sourceId]
    ),
    rmTrack = useCallback(() => dispatch(Actions.rmSource(sourceId)), [sourceId])

  /* styles */
  const delIconSty = useMemo(
    () => ({ size: s => s * 1.1, color: c => c.contrast(0.3) }),
    []
  )

  return (
    <TrackContainer selected={source.selected} onClick={handleClick}>
      <TrackCanvasWrapper
        inRef={container}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        <TrackCanvas
          selected={source.selected}
          inRef={canvasRef}
          width={width * 2}
          height={height * 2}
        />
        <CornerWrapper>
          <TrackName>
            {source.name}&nbsp;
            <Icon asButton onClick={rmTrack} styles={delIconSty} name="close-thin" />
          </TrackName>
        </CornerWrapper>
      </TrackCanvasWrapper>
      {source.selected && <TrackArrow />}
    </TrackContainer>
  )
})
