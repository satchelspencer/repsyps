import React, { memo, useMemo } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'

import Icon from 'render/components/icon'
import { WideButton, Horizontal, FillButton } from 'render/components/misc'

export interface LoopProps {
  trackId: string
}

const options = [1, 2, 4, 8]

const Loop = memo((props: LoopProps) => {
  const { chunks, chunkIndex } = useSelector(
      (state) => state.live.tracks[props.trackId].playback
    ),
    bounds = useSelector((state) => state.sources[props.trackId].bounds),
    dispatch = useDispatch(),
    chunkLength = chunks[chunkIndex * 2 + 1],
    wrapperStyles = useMemo(() => ({ disabled: !chunkLength || !bounds.length }), [
      chunkLength,
      bounds,
    ])

  return (
    <Horizontal styles={wrapperStyles}>
      {options.map((n) => (
        <WideButton
          key={n}
          onClick={() => dispatch(Actions.loopTrack({ trackId: props.trackId, loop: n }))}
        >
          <Icon name="loop" /> &nbsp;{n}
        </WideButton>
      ))}
      <FillButton
        onClick={() => dispatch(Actions.loopTrack({ trackId: props.trackId, loop: -1 }))}
      >
        <Icon name="next" />
        &nbsp;to end
      </FillButton>
    </Horizontal>
  )
})

export default Loop
