import { useMemo, useState, useCallback } from 'react'
import { useDispatch } from 'redux-react-hook'
import _ from 'lodash'

import * as Actions from '../redux/actions'
import { getBoundIndex, getNextBoundIndex, getTimeFromPosition } from './waveform-utils'

import { ClickEventContext, BoundViewContext } from './waveform'

export interface ClickPos {
  x: number
  y: number
}

/* click and or drag to select playback region */
export function useSelectPlayback(trackId: string) {
  const dispatch = useDispatch()
  return useCallback(
    (
      ctxt: ClickEventContext,
      pos: ClickPos,
      boundView: BoundViewContext,
      length: number
    ) => {
      const { clickX, editing, height } = ctxt,
        { x, y } = pos,
        next = getNextBoundIndex(x, boundView)

      /* selection only counts if it is not on a bar */
      if (editing && (next === -1 || Math.abs(y - height / 2) > 10)) {
        const dx = Math.abs(x - clickX),
          xPos = getTimeFromPosition(x, true, boundView)

        if (dx < 3) {
          //click to play
          dispatch(
            Actions.updateTrackPlayback({
              id: trackId,
              playback: { start: xPos, length: 0, alpha: null, aperiodic: true },
              nextPlayback: [],
            })
          )
        } else {
          //dragged selection
          const start = getTimeFromPosition(clickX, true, boundView),
            len = Math.abs(xPos - start)

          dispatch(
            Actions.updateTrackPlayback({
              id: trackId,
              playback: {
                start: Math.min(start, xPos),
                length: len,
                alpha: len / length,
                aperiodic: true,
              },
              nextPlayback: [],
            })
          )
        }
      }
    },
    []
  )
}

/* click on measure, or click and drag on measures to playback in sync */
export function useMeasurePlayback(trackId: string) {
  const dispatch = useDispatch()

  return useCallback(
    (
      ctxt: ClickEventContext,
      pos: ClickPos,
      boundView: BoundViewContext,
      alpha: number,
      length: number
    ) => {
      const { clickX, editing, height } = ctxt,
        { x, y } = pos,
        next = getNextBoundIndex(x, boundView),
        start = (clickX && getNextBoundIndex(clickX, boundView)) || next,
        dx = Math.abs(x - clickX)

      if (next !== -1 && !editing) {
        let playBacks = []
        for (let bi = start; bi <= next; bi++) {
          const endBound = boundView.bounds[bi],
            startBound = boundView.bounds[bi - 1],
            newLen = endBound - startBound
          playBacks.push({
            start: startBound,
            length: newLen,
            alpha: alpha || 1,
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
      } else if (editing && dx < 3 && Math.abs(y - height / 2) < 10 && next !== -1) {
        const endBound = boundView.bounds[next],
          startBound = boundView.bounds[next - 1],
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
    },
    []
  )
}

/* click and drag on bounds in edit mode to move them */
export function useDraggableBounds(trackId: string) {
  const [movingBoundIndex, setMovingBoundIndex] = useState(-1),
    dispatch = useDispatch()

  return useMemo(
    () => ({
      mouseDown(ctxt: ClickEventContext, pos: ClickPos, boundView: BoundViewContext) {
        const { clickX, editing, selected, height } = ctxt,
          { x, y } = pos

        if (Math.abs(y - height / 2) < 10 && editing) {
          const bound = getBoundIndex(x, boundView)
          if (bound !== -1) {
            setMovingBoundIndex(bound)
            dispatch(
              Actions.updateTrackPlayback({ id: trackId, playback: { on: false } })
            )
          }
        }
      },
      mouseMove(
        ctxt: ClickEventContext,
        pos: ClickPos,
        boundView: BoundViewContext,
        length: number,
        playback: any
      ) {
        const { clickX, editing, selected, height } = ctxt,
          { x, y } = pos
        if (movingBoundIndex !== -1) {
          const sample = getTimeFromPosition(x, true, boundView),
            newBounds = [...boundView.bounds]
          newBounds[movingBoundIndex] = sample
          dispatch(
            Actions.setTrackBounds({
              id: trackId,
              bounds: newBounds,
            })
          )
          const oldPos = boundView.bounds[movingBoundIndex],
            nextBound = boundView.bounds[movingBoundIndex + 1]

          if (playback.start === oldPos) {
            const newLen = playback.length && nextBound - sample
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

          if (playback.length === oldPos - playback.start) {
            const newLen = sample - playback.start
            dispatch(
              Actions.updateTrackPlayback({
                id: trackId,
                playback: { length: newLen, alpha: newLen / length },
              })
            )
          }
        }
      },
      mouseUp(ctxt: ClickEventContext, pos: ClickPos, boundView: BoundViewContext) {
        const { clickX, editing, selected, height } = ctxt,
          { x, y } = pos

        if (editing && selected) {
          if (movingBoundIndex !== -1) {
            //we were dragging a bound
            setMovingBoundIndex(-1)
          }
        }
      },
    }),
    [movingBoundIndex]
  )
}
