import { useState, useMemo } from 'react'
import _ from 'lodash'

import { useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import { getTimeFromPosition, getBoundIndex, getNextBoundIndex } from './utils'
import * as Types from 'render/util/types'
import { canvasScale } from 'render/util/env'

import { ClickEventContext, ViewContext } from './track'

export interface ClickPos {
  x: number
  y: number
}

/* click and drag to move a boundary */
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
          const sample = getTimeFromPosition(pos.x, view.snap, view),
            newBounds = [...bounds]
          newBounds[boundIndex] = sample
          dispatch(Actions.setSourceBounds({ sourceId: trackId, bounds: newBounds }))
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

/* shift click and drag to slide tracks relative to each other */
export function useOffsetTrack(trackId: string) {
  const dispatch = useDispatch(),
    [startX, setStartX] = useState(-1),
    [startingOffset, setStartingOffset] = useState(0)

  return useMemo(
    () => ({
      mouseDown(ctxt: ClickEventContext, pos: ClickPos, shiftKey: boolean) {
        if (!ctxt.sourceTrackEditing || !shiftKey) return false
        else {
          setStartX(pos.x)
          setStartingOffset(ctxt.currentEditingOffset)
          return true
        }
      },
      mouseMove(ctxt: ClickEventContext, pos: ClickPos, view: ViewContext) {
        if (startX !== -1) {
          const offset = (pos.x - startX) * canvasScale * view.scale
          dispatch(
            Actions.setTrackSourceParams({
              trackId,
              sourceTrackId: ctxt.sourceTrackEditing,
              sourceTrackParams: {
                offset: startingOffset + offset,
              },
            })
          )
          return true
        }
        return false
      },
      mouseUp(ctxt: ClickEventContext, pos: ClickPos) {
        if (!ctxt.sourceTrackEditing || startX === -1) return false
        if (startX !== -1) setStartX(-1)
        return true
      },
    }),
    [trackId, startX, startingOffset]
  )
}

/* click and drag the edges of chunk */
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
        if (!ctxt.aperiodic) return false
        const sample = getTimeFromPosition(pos.x, view.snap, view),
          nearChunkIndex = _.findIndex(chunks, (chunk, i) => {
            const csample = i % 2 === 0 ? chunk : chunk + chunks[i - 1]
            return Math.abs(csample - sample) < 9 * view.scale
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
        if (!ctxt.aperiodic) return false
        if (chunkIndex !== -1) {
          const sample = getTimeFromPosition(pos.x, view.snap, view),
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
        if (!ctxt.aperiodic) return false
        if (chunkIndex !== -1) {
          if (ctxt.clickX === pos.x) { //if no drag
            const sample = getTimeFromPosition(pos.x, view.snap, view)
            dispatch(
              Actions.setTrackPlayback({
                trackId,
                playback: {
                  chunks: [sample, 0],
                },
              })
            )
          }

          setChunkIndex(-1)
        }
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
        if (!ctxt.aperiodic) return false
        const dx = Math.abs(pos.x - ctxt.clickX),
          xPos = getTimeFromPosition(pos.x, view.snap, view)
        if (dx < 3) {
          //click to play
          dispatch(
            Actions.setTrackPlayback({
              trackId,
              playback: {
                chunks: [xPos, 0],
                aperiodic: true,
                chunkIndex: -1,
              },
            })
          )
        } else {
          //dragged selection
          const start = getTimeFromPosition(ctxt.clickX, view.snap, view),
            len = Math.abs(xPos - start)

          dispatch(
            Actions.setTrackPlayback({
              trackId,
              playback: {
                chunks: [Math.min(start, xPos), len],
                aperiodic: true,
                chunkIndex: -1,
                loop: true,
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

/* while not synced, double click in measure to select whole measure or click on 
bound to start from there */
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
        if (!ctxt.aperiodic) return false
        const closeBoundIndex = getBoundIndex(pos.x, view, bounds)
        if (Math.abs(ctxt.clickX - pos.x) < 3 && closeBoundIndex !== -1) {
          dispatch(
            Actions.setTrackPlayback({
              trackId,
              playback: {
                chunks: [bounds[closeBoundIndex], 0],
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
        if (!ctxt.aperiodic) return false
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
                aperiodic: true,
                chunkIndex: -1,
                loop: true,
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

/* selection while synced, using nearest bounds */
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
        if (ctxt.aperiodic || bounds.length < 2 || (!selected && ctxt.clickX === pos.x))
          return false
        const firstBoundIndex = getNextBoundIndex(ctxt.clickX, view, bounds),
          secondBoundIndex = getNextBoundIndex(pos.x, view, bounds)

        let startBoundIndex = Math.min(firstBoundIndex, secondBoundIndex),
          endBoundIndex = Math.max(firstBoundIndex, secondBoundIndex)

        if (startBoundIndex === endBoundIndex) {
          if (startBoundIndex === 0) {
            startBoundIndex = 1
            endBoundIndex = 1
          } else if (startBoundIndex === -1) {
            startBoundIndex = bounds.length - 1
            endBoundIndex = bounds.length - 1
          }
        } else {
          if (startBoundIndex < 1) startBoundIndex = 1
          if (endBoundIndex === -1) endBoundIndex = bounds.length - 1
        }

        if (startBoundIndex && endBoundIndex) {
          const chunkCount = Math.abs(endBoundIndex - startBoundIndex) + 1,
            initIndex = Math.min(startBoundIndex, endBoundIndex),
            chunks = _.flatten(
              _.range(chunkCount).map((ci) => {
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
                aperiodic: false,
                chunkIndex: -1,
                loop: true,
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
