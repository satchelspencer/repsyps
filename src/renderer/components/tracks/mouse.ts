import { useCallback } from 'react'
import { useDispatch } from 'redux-react-hook'
import _ from 'lodash'

import * as Actions from '../../redux/actions'
import { getTimeFromPosition } from './utils'

import { ClickEventContext, BoundViewContext } from './source'

export interface ClickPos {
  x: number
  y: number
}

/* click and or drag to select playback region */
export function useSelectPlayback(sourceId: string) {
  const dispatch = useDispatch()
  return useCallback(
    (
      ctxt: ClickEventContext,
      pos: ClickPos,
      boundView: BoundViewContext,
      length: number
    ) => {
      const { clickX, editing } = ctxt,
        { x, y } = pos
      if (editing) {
        const dx = Math.abs(x - clickX),
          xPos = getTimeFromPosition(x, true, boundView)

        if (dx < 3) {
          //click to play
          dispatch(
            Actions.setSourcePlayback({
              sourceId,
              playback: { chunks: [xPos, 0], alpha: 1, aperiodic: true, chunkIndex: -1 },
            })
          )
        } else {
          //dragged selection
          const start = getTimeFromPosition(clickX, true, boundView),
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
    []
  )
}
