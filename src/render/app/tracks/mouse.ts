import { useCallback, useState, useMemo } from 'react'
import { useDispatch } from 'redux-react-hook'
import _ from 'lodash'

import * as Actions from 'render/redux/actions'
import { getTimeFromPosition } from './utils'
import * as Types from 'lib/types'

import { ClickEventContext, ViewContext } from './source'

export interface ClickPos {
  x: number
  y: number
}

/* click and or drag to select playback region */
export function useSelectPlayback(sourceId: string) {
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
        const sample = getTimeFromPosition(pos.x, false, view),
          nearChunkIndex = _.findIndex(chunks, (chunk, i) => {
            const csample = i % 2 === 0 ? chunk : chunk + chunks[i - 1]
            return Math.abs(csample - sample) < 7 * view.scale
          })
        setChunkIndex(nearChunkIndex)
      },
      mouseMove(
        ctxt: ClickEventContext,
        pos: ClickPos,
        view: ViewContext,
        chunks: Types.Chunks
      ) {
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
            Actions.setSourcePlayback({
              sourceId,
              playback: {
                chunks: newChunks,
              },
            })
          )
        }
      },
      mouseUp(ctxt: ClickEventContext, pos: ClickPos, view: ViewContext) {
        const { clickX, editing } = ctxt,
          { x, y } = pos

        if (chunkIndex !== -1) {
          setChunkIndex(-1)
        } else if (editing) {
          const dx = Math.abs(x - clickX),
            xPos = getTimeFromPosition(x, true, view)
          if (dx < 3) {
            //click to play
            dispatch(
              Actions.setSourcePlayback({
                sourceId,
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
            const start = getTimeFromPosition(clickX, true, view),
              len = Math.abs(xPos - start)

            dispatch(
              Actions.setSourcePlayback({
                sourceId,
                playback: {
                  chunks: [Math.min(start, xPos), len],
                  alpha: 1,
                  aperiodic: true,
                  chunkIndex: -1,
                },
              })
            )
          }
        }
      },
    }),
    [sourceId, chunkIndex]
  )
}
