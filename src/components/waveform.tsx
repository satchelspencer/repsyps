import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import ctyled from 'ctyled'
import { useDispatch } from 'redux-react-hook'
import _ from 'lodash'

import getImpulses, { binSize } from '../dsp/impulse-detect'
import getMinMaxes from '../dsp/min-maxes'
import { drawWaveform, drawImpulses, drawPlayback } from './waveform-canvas'
import * as Types from '../redux/types'
import * as Actions from '../redux/actions'

const TrackContainer = ctyled.div.styles({
  height: 10,
  flex: 'none',
  border: 1,
})

const TrackCanvas = ctyled.canvas.styles({}).extend`
  position:absolute;
  width:100%;
  height:100%;
`

interface WaveformProps {
  track: Types.TrackState
}

export default function Track({ track }: WaveformProps) {
  const container = useRef(null),
    canvasRef = useRef(null),
    [scale, setScale] = useState(200),
    [start, setStart] = useState(0),
    [width, setWidth] = useState(0),
    [height, setHeight] = useState(0),
    [center, setCenter] = useState(0),
    handleWheel = useRef(null),
    ctxt = useRef(null),
    dispatch = useDispatch()

  /* ZOOM/PANNING CONTROL */
  const handleMouseMove = useCallback(e => {
    setCenter(e.clientX - container.current.offsetLeft)
  }, [])

  useEffect(() => {
    handleWheel.current = e => {
      const { deltaX, deltaY, ctrlKey } = e
      if (ctrlKey) {
        const scaleMultiplier = scale / 100,
          nextScale = Math.max(scale + deltaY * scaleMultiplier, 2),
          dx = (nextScale - scale) * center
        setStart(start - dx)
        setScale(nextScale)
      } else {
        setStart(start + deltaX * scale)
      }
    }
  }, [scale, start])

  useEffect(() => {
    container.current.addEventListener(
      'wheel',
      e => {
        e.preventDefault()
        handleWheel.current && handleWheel.current(e)
      },
      { passive: false } //so we can prevent default
    )
    setWidth(container.current.offsetWidth)
    setHeight(container.current.offsetHeight)
    setCenter(container.current.offsetWidth / 2)
  }, [container.current])

  /* WAVEFORM DRAWING ON CANVAS */
  const buffer = useMemo(() => track.buffer.getChannelData(1), [track.buffer]),
    impulses = useMemo(() => getImpulses(buffer), [buffer]),
    minMaxes = useMemo(() => getMinMaxes(buffer), [buffer]),
    effectivePos = track.playback.on ? track.position : 0

  useEffect(() => {
    ctxt.current = canvasRef.current.getContext('2d')
    ctxt.current.scale(2, 2)
    ctxt.current.imageSmoothingEnabled = false
  }, [])

  useEffect(() => {
    if (!width) return
    const pwidth = width * 2,
      pheight = height * 2,
      ctx = ctxt.current,
      drawContext = { pwidth, pheight, scale, start, ctx }

    ctx.clearRect(0, 0, pwidth, pheight)

    drawWaveform(drawContext, minMaxes)
    drawImpulses(drawContext, impulses)
    drawPlayback(drawContext, track)
  }, [buffer, scale, start, width, height, track.playback, effectivePos])

  /* playback/selection */
  const [clickX, setClickX] = useState(null),
    handleMouseDown = useCallback(e => {
      const x = e.clientX - container.current.offsetLeft
      setClickX(x)
    }, []),
    handleMouseUp = useCallback(
      e => {
        const x = e.clientX - container.current.offsetLeft
        const dx = x - clickX
        console.log(dx)
        if (!dx) {
          const pos = getTimeFromPosition(x, true)
          dispatch(
            Actions.updateTrackPlayback({
              id: track.name,
              playback: { start: pos, length: 0 },
              immediate: true,
            })
          )
        } else {
          const start = getTimeFromPosition(clickX, true),
            end = getTimeFromPosition(x, true)
          dispatch(
            Actions.updateTrackPlayback({
              id: track.name,
              playback: { start, length: end - start },
              immediate: true,
            })
          )
        }
        setClickX(null)
      },
      [clickX]
    ),
    getTimeFromPosition = useCallback(
      (x: number, snap: boolean) => {
        let raw = x * 2 * scale + start
        if (snap) {
          const impulseIndex = Math.floor(raw / 256),
            range = scale / 10

          for (let i = 0; i < range; i = -1 * (i + (i > 0 ? 0 : -1))) {
            const impulse = impulses[impulseIndex + i]
            if (impulse > 0) {
              raw = (impulseIndex + i) * 256
              break
            }
          }
        }

        return raw
      },
      [width, height, track.playback, impulses, start, scale]
    )

  return (
    <TrackContainer
      inRef={container}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {track.name}: {Math.floor(scale)}, {Math.floor(start)}
      <TrackCanvas
        inRef={canvasRef}
        width={width * 2}
        height={height * 2}
        style={{ width: '100%', height: '100%' }}
      />
    </TrackContainer>
  )
}
