import React, { useRef, useMemo, useState, useCallback } from 'react'
import ctyled from 'ctyled'
import { useDispatch, useMappedState } from 'redux-react-hook'
import _ from 'lodash'

import getImpulses from '../dsp/impulse-detect'
import useWaveformCanvas from './waveform-canvas'
import * as Types from '../redux/types'
import * as Actions from '../redux/actions'
import {
  inferTimeBase,
  getBoundIndex,
  getNextBoundIndex,
  getTimeFromPosition,
  getContainerPosition,
} from './waveform-utils'
import useZoom from './waveform-zoom'

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

const getMappedState = (state: Types.AppState) => ({ length: state.mix.length })

export default function Track({ track, trackId }: WaveformProps) {
  //refs
  const container = useRef(null)

  // state
  const [center, setCenter] = useState(0),
    [movingBoundIndex, setMovingBoundIndex] = useState(-1),
    [clickX, setClickX] = useState(null)

  //redux/context
  const dispatch = useDispatch(),
    { length } = useMappedState(getMappedState)

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

  const getRelativePos = useCallback(e => ({ x: e.clientX - left, y: e.clientY - top }), [
    left,
    top,
  ])

  /* playback/selection */
  const handleMouseDown = useCallback(
      e => {
        const { x, y } = getRelativePos(e)
        if (y < 20 && track.selected) {
          const bound = getBoundIndex(x, boundView)
          if (bound !== -1) {
            setMovingBoundIndex(bound)
            dispatch(
              Actions.updateTrackPlayback({ id: trackId, playback: { on: false } })
            )
          }
        }

        if (!track.editing || track.selected) setClickX(x)
      },
      [track.editing, track.selected, ...boundViewValues]
    ),
    handleMouseMove = useCallback(
      e => {
        const { x } = getRelativePos(e)
        setCenter(x)
        if (movingBoundIndex !== -1) {
          const sample = getTimeFromPosition(x, true, view),
            newBounds = [...track.bounds]
          newBounds[movingBoundIndex] = sample
          dispatch(
            Actions.setTrackBounds({
              id: trackId,
              bounds: newBounds,
            })
          )
          const oldPos = track.bounds[movingBoundIndex],
            nextBound = track.bounds[movingBoundIndex + 1]

          if (track.playback.start === oldPos) {
            const newLen = track.playback.length && nextBound - sample
            dispatch(
              Actions.updateTrackPlayback({
                id: trackId,
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
                id: trackId,
                playback: { length: newLen, alpha: newLen / length },
              })
            )
          }
        }
      },
      [movingBoundIndex, ...boundViewValues, track]
    ),
    handleMouseUp = useCallback(
      e => {
        const { x, y } = getRelativePos(e),
          dx = x - clickX

        if (track.editing) {
          //EDITING
          if (!track.selected) return //if we are selected and in edit mode
          if (movingBoundIndex !== -1) {
            //we were dragging a bound
            setMovingBoundIndex(-1)
          } else if (y < 20) {
            const next = getNextBoundIndex(x, boundView)
            if (next !== -1) {
              const endBound = track.bounds[next],
                startBound = track.bounds[next - 1],
                newLen = endBound - startBound
              dispatch(
                Actions.updateTrackPlayback({
                  id: trackId,
                  playback: {
                    start: startBound,
                    length: newLen,
                    alpha: newLen ? newLen / length : null,
                    aperiodic: true,
                  },
                  nextPlayback: [],
                })
              )
            }
          } else {
            //set playback
            if (dx < 3) {
              //click to play
              const pos = getTimeFromPosition(x, true, view)
              dispatch(
                Actions.updateTrackPlayback({
                  id: trackId,
                  playback: { start: pos, length: 0, alpha: null, aperiodic: true },
                  nextPlayback: [],
                })
              )
            } else {
              //dragged selection
              const start = getTimeFromPosition(clickX, true, view),
                end = getTimeFromPosition(x, true, view),
                len = Math.abs(end - start)
              dispatch(
                Actions.updateTrackPlayback({
                  id: trackId,
                  playback: {
                    start: Math.min(start, end),
                    length: len,
                    alpha: len / length,
                    aperiodic: true,
                  },
                  nextPlayback: [],
                })
              )
            }
          }
        } else {
          //SYNCED PLAYBACK
          const next = getNextBoundIndex(x, boundView),
            start = (clickX && getNextBoundIndex(clickX, boundView)) || next
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
                id: trackId,
                playback: first,
                nextPlayback: playBacks,
              })
            )
          }
        }
        setClickX(null)
      },
      [clickX, ...boundViewValues, track.selected, track.editing]
    )

  return (
    <TrackContainer
      selected={track.selected}
      onClick={() => dispatch(Actions.selectTrackExclusive(trackId))}
    >
      <TrackControls>
        <span>
          {track.name}: {Math.floor(scale)}spx
        </span>
        <button
          onClick={() =>
            dispatch(
              Actions.editTrack({
                id: trackId,
                edit: !track.editing,
              })
            )
          }
          children={track.editing ? 'done' : 'edit'}
        />
        <button onClick={() => dispatch(Actions.rmTrack(trackId))} children="x" />
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
                    id: trackId,
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
                    id: trackId,
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
                    id: trackId,
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
                    id: trackId,
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
  )
}
