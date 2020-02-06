import { useCallback, useState, useMemo } from 'react'
import { useDispatch } from 'redux-react-hook'
import _ from 'lodash'

import * as Actions from 'render/redux/actions'
import { getTimeFromPosition, getBoundIndex, getNextBoundIndex } from './utils'
import * as Types from 'render/util/types'

import { ClickEventContext, ViewContext } from './track'

export interface ClickPos {
  x: number
  y: number
}

export function useResizeBounds(trackId: string) {
  const dispatch = useDispatch(),
    [boundIndex, setBoundIndex] = useState(-1)

  return useMemo(
    () => ({
      mouseDown(
        ctxt: ClickEventContext,
        view: ViewContext,
        pos: ClickPos,
        bounds: number[]
      ) {
        if (!ctxt.editing) return false
        const closeBoundIndex = getBoundIndex(pos.x, view, bounds)
        setBoundIndex(closeBoundIndex)
        return closeBoundIndex !== -1 //capture if boundindex
      },
      mouseMove(
        ctxt: ClickEventContext,
        view: ViewContext,
        pos: ClickPos,
        bounds: number[]
      ) {
        if (!ctxt.editing) return false
        if (boundIndex !== -1) {
          const sample = getTimeFromPosition(pos.x, true, view),
            newBounds = [...bounds]
          newBounds[boundIndex] = sample
          dispatch(Actions.setTrackBounds({ trackId, bounds: newBounds }))
        }
        return boundIndex !== -1
      },
      mouseUp(ctxt: ClickEventContext, pos: ClickPos, view: ViewContext) {
        if (!ctxt.editing) return false
        if (boundIndex !== -1) setBoundIndex(-1)
        return boundIndex !== -1
      },
    }),
    [trackId, boundIndex]
  )
}

export function useResizePlayback(trackId: string) {
  const dispatch = useDispatch(),
    [chunkIndex, setChunkIndex] = useState(-1)

  return useMemo(
    () => ({
      mouseDown(
        ctxt: ClickEventContext,
        view: ViewContext,
        pos: ClickPos,
        chunks: Types.Chunks
      ) {
        if (!ctxt.editing) return false
        const sample = getTimeFromPosition(pos.x, false, view),
          nearChunkIndex = _.findIndex(chunks, (chunk, i) => {
            const csample = i % 2 === 0 ? chunk : chunk + chunks[i - 1]
            return Math.abs(csample - sample) < 7 * view.scale
          })
        setChunkIndex(nearChunkIndex)
        return nearChunkIndex !== -1
      },
      mouseMove(
        ctxt: ClickEventContext,
        pos: ClickPos,
        view: ViewContext,
        chunks: Types.Chunks
      ) {
        if (!ctxt.editing) return false
        if (chunkIndex !== -1) {
          const sample = getTimeFromPosition(pos.x, true, view),
            newChunks = [...chunks],
            isStart = chunkIndex % 2 === 0

          if (!isStart) {
            newChunks[chunkIndex] = sample - chunks[chunkIndex - 1]
          } else {
            const hasLen = newChunks[chunkIndex + 1] > 0
            if (hasLen) {
              newChunks[chunkIndex] = sample
              newChunks[chunkIndex + 1] += chunks[chunkIndex] - sample
            } else {
              if (sample > chunks[chunkIndex]) setChunkIndex(chunkIndex + 1)
              else chunks[chunkIndex + 1] = 1
            }
          }

          dispatch(
            Actions.setTrackPlayback({
              trackId,
              playback: {
                chunks: newChunks,
              },
            })
          )
        }
        return chunkIndex !== -1
      },
      mouseUp(ctxt: ClickEventContext, pos: ClickPos, view: ViewContext) {
        if (!ctxt.editing) return false
        if (chunkIndex !== -1) setChunkIndex(-1)
        return chunkIndex !== -1
      },
    }),
    [trackId, chunkIndex]
  )
}

/* click and or drag to select playback region */
export function useSelectPlayback(trackId: string) {
  const dispatch = useDispatch()

  return useMemo(
    () => ({
      mouseUp(ctxt: ClickEventContext, pos: ClickPos, view: ViewContext) {
        if (!ctxt.editing) return false
        const dx = Math.abs(pos.x - ctxt.clickX),
          xPos = getTimeFromPosition(pos.x, true, view)
        if (dx < 3) {
          //click to play
          dispatch(
            Actions.setTrackPlayback({
              trackId,
              playback: {
                chunks: [xPos, 0],
                alpha: 1,
                aperiodic: true,
                chunkIndex: -1,
              },
            })
          )
        } else {
          //dragged selection
          const start = getTimeFromPosition(ctxt.clickX, true, view),
            len = Math.abs(xPos - start)

          dispatch(
            Actions.setTrackPlayback({
              trackId,
              playback: {
                chunks: [Math.min(start, xPos), len],
                alpha: 1,
                aperiodic: true,
                chunkIndex: -1,
              },
            })
          )
        }
        return true
      },
    }),
    [trackId]
  )
}

export function useSelectBound(trackId: string) {
  const dispatch = useDispatch()

  return useMemo(
    () => ({
      mouseUp(
        ctxt: ClickEventContext,
        pos: ClickPos,
        view: ViewContext,
        bounds: number[]
      ) {
        if (!ctxt.editing) return false
        const closeBoundIndex = getBoundIndex(pos.x, view, bounds)
        if (Math.abs(ctxt.clickX - pos.x) < 3 && closeBoundIndex !== -1) {
          dispatch(
            Actions.setTrackPlayback({
              trackId,
              playback: {
                chunks: [bounds[closeBoundIndex], 0],
                alpha: 1,
                aperiodic: true,
                chunkIndex: -1,
              },
            })
          )
          return true
        } else return false
      },
      doubleClick(
        ctxt: ClickEventContext,
        pos: ClickPos,
        view: ViewContext,
        bounds: number[]
      ) {
        if (!ctxt.editing) return false
        const nextBoundIndex = getNextBoundIndex(pos.x, view, bounds),
          prevBoundIndex = nextBoundIndex - 1,
          start = bounds[prevBoundIndex],
          next = bounds[nextBoundIndex]

        if (prevBoundIndex >= 0) {
          dispatch(
            Actions.setTrackPlayback({
              trackId,
              playback: {
                chunks: [start, next - start],
                alpha: 1,
                aperiodic: true,
                chunkIndex: -1,
              },
            })
          )
          return true
        } else return false
      },
    }),
    [trackId]
  )
}

export function usePlaybackBound(trackId: string) {
  const dispatch = useDispatch()

  return useMemo(
    () => ({
      mouseUp(
        ctxt: ClickEventContext,
        pos: ClickPos,
        view: ViewContext,
        bounds: number[],
        selected: boolean
      ) {
        if (ctxt.editing || (!selected && ctxt.clickX === pos.x)) return false
        const startBoundIndex = getNextBoundIndex(ctxt.clickX, view, bounds),
          endBoundIndex = getNextBoundIndex(pos.x, view, bounds)

        if (startBoundIndex && endBoundIndex) {
          const chunkCount = Math.abs(endBoundIndex - startBoundIndex) + 1,
            initIndex = Math.min(startBoundIndex, endBoundIndex),
            chunks = _.flatten(
              _.range(chunkCount).map(ci => {
                const start = bounds[initIndex + ci - 1],
                  end = bounds[initIndex + ci]
                return [start, end - start]
              })
            )
          dispatch(
            Actions.setTrackPlayback({
              trackId,
              playback: {
                chunks,
                alpha: 1,
                aperiodic: false,
                chunkIndex: -1,
              },
            })
          )
        }
        return true
      },
    }),
    [trackId]
  )
}
