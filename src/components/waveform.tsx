import React, {
  useRef,
  useEffect,
  useContext,
  useMemo,
  useState,
  useCallback,
} from 'react'
import { HotKeys } from 'react-hotkeys'
import ctyled, { CtyledContext } from 'ctyled'
import { useDispatch, useMappedState } from 'redux-react-hook'
import _ from 'lodash'

import getImpulses, { binSize } from '../dsp/impulse-detect'
import getMinMaxes from '../dsp/min-maxes'
import {
  drawWaveform,
  drawImpulses,
  drawPlayback,
  drawBounds,
  drawSelection,
  drawNextPlayback,
} from './waveform-canvas'
import * as Types from '../redux/types'
import * as Actions from '../redux/actions'

const TrackContainer = ctyled.div.attrs({ selected: false }).styles({
  height: 10,
  flex: 'none',
  lined: true,
  color: (c, { selected }) => (selected ? c.nudge(0.1) : c),
})

const TrackCanvas = ctyled.canvas.attrs({ selected: false }).styles({}).extend`
  position:absolute;
  width:100%;
  height:100%;
  transition:0.3s all;
  ${(_, { selected }) => selected && `box-shadow:0 0 5px rgba(0,0,0,0.2) inset;`}
`

const TrackControls = ctyled.div.styles({
  width: 10,
  column: true,
  gutter: 1,
  bg: true,
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

function inferTimeBase(playback: Types.PlaybackState, impulses: Float32Array): number[] {
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
    [movingBoundIndex, setMovingBoundIndex] = useState(-1),
    [clickX, setClickX] = useState(null)

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
    if (track.editing) drawImpulses(drawContext, impulses)
    drawPlayback(drawContext, track)
    drawBounds(drawContext, track.bounds, track.editing)
    drawSelection(drawContext, clickX, center)
    drawNextPlayback(drawContext, track.nextPlayback)
  }, [
    buffer,
    scale,
    start,
    width,
    height,
    track.playback,
    effectivePos,
    track.bounds,
    track.editing,
    track.selected,
    clickX && center,
  ])

  /* playback/selection */
  const handleMouseDown = useCallback(
      e => {
        const x = e.clientX - container.current.offsetLeft,
          y = e.clientY - container.current.getBoundingClientRect().y

        if (y < 20 && !track.selected) {
          const bound = getBoundIndex(x)
          if (bound !== -1) {
            setMovingBoundIndex(bound)
            dispatch(Actions.updateMixState({ on: false }))
          }
        }

        if (track.selected) setClickX(x)
      },
      [track.bounds, scale, start, track.selected]
    ),
    handleMouseMove = useCallback(
      e => {
        const x = e.clientX - container.current.offsetLeft
        setCenter(x)
        if (movingBoundIndex !== -1) {
          const sample = getTimeFromPosition(x, true),
            newBounds = [...track.bounds]
          newBounds[movingBoundIndex] = sample
          dispatch(
            Actions.setTrackBounds({
              id: track.name,
              bounds: newBounds,
            })
          )
          const oldPos = track.bounds[movingBoundIndex],
            nextBound = track.bounds[movingBoundIndex + 1]

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
              })
            )
          }

          if (track.playback.length === oldPos - track.playback.start) {
            const newLen = sample - track.playback.start
            dispatch(
              Actions.updateTrackPlayback({
                id: track.name,
                playback: { length: newLen, alpha: newLen / length },
              })
            )
          }
        }
      },
      [movingBoundIndex, track.bounds, track]
    ),
    handleMouseUp = useCallback(
      e => {
        const x = e.clientX - container.current.offsetLeft,
          y = e.clientY - container.current.getBoundingClientRect().y,
          dx = x - clickX

        if (track.editing) {
          if (track.selected) {
            //if we are selected and in edit mode
            if (movingBoundIndex !== -1) {
              //we were dragging a bound
              setMovingBoundIndex(-1)
            } else if (y < 20) {
              const next = getNextBoundIndex(x)
              if (next !== -1) {
                const endBound = track.bounds[next],
                  startBound = track.bounds[next - 1],
                  newLen = endBound - startBound
                dispatch(
                  Actions.updateTrackPlayback({
                    id: track.name,
                    playback: {
                      start: startBound,
                      length: newLen,
                      alpha: newLen ? newLen / length : null,
                      aperiodic: true,
                    },
                  })
                )
              }
            } else {
              //set playback
              if (dx < 3) {
                //click to play
                const pos = getTimeFromPosition(x, true)
                dispatch(
                  Actions.updateTrackPlayback({
                    id: track.name,
                    playback: { start: pos, length: 0, alpha: null },
                  })
                )
              } else {
                //dragged selection
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
                  })
                )
              }
            }
          }
        } else {
          const next = getNextBoundIndex(x),
            start = clickX && getNextBoundIndex(clickX)
          if (next !== -1) {
            let playBacks = []
            for (let bi = start; bi <= next; bi++) {
              const endBound = track.bounds[bi],
                startBound = track.bounds[bi - 1],
                newLen = endBound - startBound
              playBacks.push({
                start: startBound,
                length: newLen,
                alpha: 1,
                aperiodic: false,
              })
            }
            // cycle first to end of queue
            const first = playBacks.shift()
            playBacks.push(first)

            dispatch(
              Actions.updateTrackPlayback({
                id: track.name,
                playback: first,
                nextPlayback: playBacks,
              })
            )
          }
        }
        setClickX(null)
      },
      [clickX, track.bounds, container.current, track.selected]
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
        return _.findIndex(track.bounds, b => {
          return Math.abs(b - sample) < 7 * scale
        })
      },
      [track.bounds, scale, start]
    ),
    getNextBoundIndex = useCallback(
      x => {
        const sample = getTimeFromPosition(x, false)
        return _.findIndex(track.bounds, b => {
          return b >= sample
        })
      },
      [track.bounds, scale, start]
    ),
    handlers = useMemo(
      () => ({
        playPause: () => {
          dispatch(
            Actions.updateTrackPlayback({
              id: track.name,
              playback: { on: !track.playback.on },
            })
          )
        },
      }),
      [track]
    )

  return (
    <HotKeys
      keyMap={{
        playPause: 'space',
      }}
      handlers={handlers}
      style={{ outline: 'none' }}
    >
      <TrackContainer
        selected={track.selected}
        onClick={() => dispatch(Actions.selectTrackExclusive(track.name))}
      >
        <TrackControls>
          <span>
            {track.name}: {Math.floor(scale)}spx
          </span>
          <button
            onClick={() =>
              dispatch(
                Actions.editTrack({
                  id: track.name,
                  edit: !track.editing,
                })
              )
            }
            children={track.editing ? 'done' : 'edit'}
          />
          {!track.editing && (
            <>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={track.playback.vol}
                onChange={e => {
                  dispatch(
                    Actions.updateTrackPlayback({
                      id: track.name,
                      playback: { vol: parseFloat(e.target.value) },
                    })
                  )
                }}
              />
            </>
          )}
          {track.editing && (
            <>
              <button
                onClick={() =>
                  dispatch(
                    Actions.setTrackBounds({
                      id: track.name,
                      bounds: inferTimeBase(track.playback, impulses),
                    })
                  )
                }
                children="< infer >"
              />
              <button
                onClick={() => {
                  const endPoint = track.playback.start + track.playback.length,
                    inferredBounds = inferTimeBase(track.playback, impulses).filter(
                      bound => bound <= endPoint
                    ),
                    existingBounds = track.bounds.filter(bound => bound > endPoint)

                  dispatch(
                    Actions.setTrackBounds({
                      id: track.name,
                      bounds: _.sortBy([...inferredBounds, ...existingBounds]),
                    })
                  )
                }}
                children=" < infer"
              />
              <button
                onClick={() => {
                  const startPoint = track.playback.start,
                    inferredBounds = inferTimeBase(track.playback, impulses).filter(
                      bound => bound >= startPoint
                    ),
                    existingBounds = track.bounds.filter(bound => bound < startPoint)

                  dispatch(
                    Actions.setTrackBounds({
                      id: track.name,
                      bounds: _.sortBy([...inferredBounds, ...existingBounds]),
                    })
                  )
                }}
                children="infer > "
              />
            </>
          )}
        </TrackControls>
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
            style={{ width: '100%', height: '100%' }}
          />
        </TrackCanvasWrapper>
      </TrackContainer>
    </HotKeys>
  )
}
