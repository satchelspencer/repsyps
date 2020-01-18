import React, { memo, useRef, useMemo, useState, useCallback } from 'react'
import ctyled from 'ctyled'
import { useDispatch, useMappedState } from 'redux-react-hook'
import _ from 'lodash'

import * as Types from 'lib/types'
import Icon from 'renderer/icons'
import { getContainerPosition, getRelativePos } from './utils'
import * as Actions from 'renderer/redux/actions'
import getImpulses from 'renderer/dsp/impulse-detect'

import useZoom from './zoom'
import useWaveformCanvas from './canvas'
import { useSelectPlayback } from './mouse'

const TrackContainer = ctyled.div.attrs({ selected: false }).styles({
  height: 10,
  flex: 'none',
  color: (c, { selected }) => (selected ? c.nudge(0.1) : c.nudge(0.05)),
})

const TrackCanvasWrapper = ctyled.div.styles({
  flex: 1,
  bg: true,
  color: c => c.contrast(0.3),
})

const TrackCanvas = ctyled.canvas
  .attrs({ selected: false })
  .styles({ color: (c, { selected }) => (selected ? c.nudge(0.1) : c) }).extend`
  position:absolute;
  width:100%;
  height:100%;
  transition:0.3s all;
  ${({ color }, { selected }) =>
    selected && `box-shadow:0 0 10px ${color.fg + '33'} inset;`}
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

export interface SourceProps {
  sourceId: string
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
    impulses = useMemo(() => getImpulses(buffer), [buffer])

  /* react state */
  const [center, setCenter] = useState(0),
    [clickX, setClickX] = useState(null)

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
    },
    drawView: DrawViewContext = {
      ...view,
      clickX,
      width,
      height,
    },
    boundView: BoundViewContext = {
      ...view,
      bounds: source.bounds,
    },
    boundViewValues = _.values(boundView)

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
  const selectMouseUp = useSelectPlayback(sourceId)

  const handleMouseDown = useCallback(
      e => {
        const pos = getRelativePos(e, left, top)
        //dboundsHandlers.mouseDown(clickCtxt, pos, boundView)
        setClickX(pos.x)
      },
      [...clickCtxtValues, ...boundViewValues]
    ),
    handleMouseMove = useCallback(
      e => {
        const pos = getRelativePos(e, left, top)
        //dboundsHandlers.mouseMove(clickCtxt, pos, boundView, period, track.playback)
        setCenter(pos.x)
      },
      [...clickCtxtValues, ...boundViewValues, period, source.playback]
    ),
    handleMouseUp = useCallback(
      e => {
        const pos = getRelativePos(e, left, top)
        selectMouseUp(clickCtxt, pos, boundView, period)
        // measureMouseUp(clickCtxt, pos, boundView, track.alpha, period)
        // dboundsHandlers.mouseUp(clickCtxt, pos, boundView)
        setClickX(null)
      },
      [...clickCtxtValues, ...boundViewValues, source.playback.alpha, period]
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
    </TrackContainer>
  )
})
