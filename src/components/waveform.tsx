import React, {
  useRef,
  useEffect,
  useContext,
  useMemo,
  useState,
  useCallback,
} from 'react'
import ctyled, { CtyledContext } from 'ctyled'
import { useDispatch, useMappedState } from 'redux-react-hook'
import _ from 'lodash'

import getImpulses, { binSize } from '../dsp/impulse-detect'
import getMinMaxes from '../dsp/min-maxes'
import { drawWaveform, drawImpulses, drawPlayback, drawBounds } from './waveform-canvas'
import * as Types from '../redux/types'
import * as Actions from '../redux/actions'

const TrackContainer = ctyled.div.styles({
  height: 10,
  flex: 'none',
  lined: true,
})

const TrackCanvas = ctyled.canvas.styles({}).extend`
  position:absolute;
  width:100%;
  height:100%;
`

const TrackControls = ctyled.div.styles({
  width: 10,
})

const TrackCanvasWrapper = ctyled.div.styles({
  flex: 1,
  bg: true,
  color: c => c.contrast(0.1).nudge(0.1),
})

interface WaveformProps {
  track: Types.TrackState
}

const getMappedState = (state: Types.AppState) => ({ length: state.mix.length })

function snapSampleToImpulses(raw: number, scale: number, impulses: Float32Array) {
  const impulseIndex = Math.floor(raw / binSize),
    range = 5,
    sampleRange = scale * 20

  for (let i = 0; i < range; i = -1 * (i + (i > 0 ? 0 : -1))) {
    const impulse = impulses[impulseIndex + i],
      impulseTime = (impulseIndex + i) * binSize
    if (impulse) {
      if (Math.abs(impulseTime - raw) < sampleRange) raw = impulseTime
      break
    }
  }
  return raw
}

function inferTimeBase(playback: Types.PlaybackState, impulses: Float32Array) {
  const len = impulses.length * binSize
  const bounds = []
  for (
    let sample = playback.start;
    sample < len;
    sample = snapSampleToImpulses(sample + playback.length, 400, impulses)
  ) {
    bounds.push(sample)
  }
  for (
    let sample = snapSampleToImpulses(playback.start - playback.length, 400, impulses);
    sample > 0;
    sample = snapSampleToImpulses(sample - playback.length, 400, impulses)
  ) {
    bounds.unshift(sample)
  }
  return bounds
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
    dispatch = useDispatch(),
    { length } = useMappedState(getMappedState),
    ctyledContext = useContext(CtyledContext),
    [movingBoundIndex, setMovingBoundIndex] = useState(-1)

  const [bounds, setBounds] = useState<number[]>([])

  /* ZOOM/PANNING CONTROL */

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
      drawContext = {
        pwidth,
        pheight,
        scale,
        start,
        ctx,
        color: ctyledContext.theme.color,
      }

    ctx.clearRect(0, 0, pwidth, pheight)

    drawWaveform(drawContext, minMaxes)
    drawImpulses(drawContext, impulses)
    drawPlayback(drawContext, track)
    drawBounds(drawContext, bounds)
  }, [buffer, scale, start, width, height, track.playback, effectivePos, bounds])

  /* playback/selection */
  const [clickX, setClickX] = useState(null),
    handleMouseDown = useCallback(
      e => {
        const x = e.clientX - container.current.offsetLeft,
          y = e.clientY - container.current.offsetTop

        if (y < 20) {
          const bound = getBoundIndex(x)
          if (bound !== -1) {
            setMovingBoundIndex(bound)
            dispatch(Actions.updateMixState({ on: false }))
          }
        }

        setClickX(x)
      },
      [bounds, scale, start]
    ),
    handleMouseMove = useCallback(
      e => {
        const x = e.clientX - container.current.offsetLeft
        setCenter(x)
        if (movingBoundIndex !== -1) {
          const sample = getTimeFromPosition(x, true),
            newBounds = [...bounds]
          newBounds[movingBoundIndex] = sample
          setBounds(newBounds)
          const oldPos = bounds[movingBoundIndex],
            nextBound = bounds[movingBoundIndex + 1]

          if (track.playback.start === oldPos) {
            const newLen = track.playback.length && nextBound - sample
            dispatch(
              Actions.updateTrackPlayback({
                id: track.name,
                playback: {
                  start: sample,
                  length: newLen,
                  alpha: newLen ? newLen / length : null,
                },
                immediate: true,
              })
            )
          }

          if (track.playback.length === oldPos - track.playback.start) {
            const newLen = sample - track.playback.start
            dispatch(
              Actions.updateTrackPlayback({
                id: track.name,
                playback: { length: newLen, alpha: newLen / length },
                immediate: true,
              })
            )
          }
        }
      },
      [movingBoundIndex, bounds, track]
    ),
    handleMouseUp = useCallback(
      e => {
        const x = e.clientX - container.current.offsetLeft,
          y = e.clientY - container.current.offsetTop,
          dx = x - clickX
        if (movingBoundIndex !== -1) {
          //we were dragging a bound
          setMovingBoundIndex(-1)
        } else if (y < 20) {
          const next = getNextBoundIndex(x)
          if (next !== -1) {
            const endBound = bounds[next],
              startBound = bounds[next - 1],
              newLen = endBound - startBound
            dispatch(
              Actions.updateTrackPlayback({
                id: track.name,
                playback: {
                  start: startBound,
                  length: newLen,
                  //alpha: newLen ? newLen / length : null,
                  aperiodic: false,
                  alpha: 1
                },
                immediate: true,
              })
            )
          }
        } else {
          //set playback
          if (!dx) {
            const pos = getTimeFromPosition(x, true)
            dispatch(
              Actions.updateTrackPlayback({
                id: track.name,
                playback: { start: pos, length: 0, alpha: null },
                immediate: true,
              })
            )
          } else {
            const start = getTimeFromPosition(clickX, true),
              end = getTimeFromPosition(x, true),
              len = end - start
            dispatch(
              Actions.updateTrackPlayback({
                id: track.name,
                playback: {
                  start,
                  length: len,
                  alpha: len / length,
                  aperiodic: true,
                },
                immediate: true,
              })
            )
          }
        }

        setClickX(null)
      },
      [clickX]
    ),
    getTimeFromPosition = useCallback(
      (x: number, snap: boolean) => {
        let raw = x * 2 * scale + start
        return snap ? snapSampleToImpulses(raw, scale, impulses) : raw
      },
      [width, height, track.playback, impulses, start, scale]
    ),
    getBoundIndex = useCallback(
      x => {
        const sample = getTimeFromPosition(x, false)
        return _.findIndex(bounds, b => {
          return Math.abs(b - sample) < 7 * scale
        })
      },
      [bounds, scale, start]
    ),
    getNextBoundIndex = useCallback(
      x => {
        const sample = getTimeFromPosition(x, false)
        return _.findIndex(bounds, b => {
          return b >= sample
        })
      },
      [bounds, scale, start]
    )

  return (
    <TrackContainer>
      <TrackControls>
        {track.name}: {Math.floor(scale)}, {Math.floor(start)}
        <a
          onClick={() => {
            setBounds(inferTimeBase(track.playback, impulses))
          }}
        >
          infer
        </a>
      </TrackControls>
      <TrackCanvasWrapper
        inRef={container}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <TrackCanvas
          inRef={canvasRef}
          width={width * 2}
          height={height * 2}
          style={{ width: '100%', height: '100%' }}
        />
      </TrackCanvasWrapper>
    </TrackContainer>
  )
}
