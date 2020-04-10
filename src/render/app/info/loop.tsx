import React, { memo, useMemo } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'

import Icon from 'render/components/icon'
import { WideButton, Horizontal, FillButton, HeaderContent } from 'render/components/misc'
import { adder } from 'render/components/control-adder'

const WideLoopButton = adder(WideButton),
  FillLoopButton = adder(FillButton)

export interface LoopProps {
  trackId: string
}

const options = [1, 2, 4, 8]

const Loop = memo((props: LoopProps) => {
  const { chunks, chunkIndex } = useSelector(
      (state) => state.live.tracks[props.trackId].playback
    ),
    bounds = useSelector((state) => state.sources[props.trackId].bounds),
    getTrackIndex = useMemo(() => Selectors.makeGetTrackIndex(), []),
    trackIndex = useSelector((state) => getTrackIndex(state, props.trackId)),
    dispatch = useDispatch(),
    chunkLength = chunks[chunkIndex * 2 + 1],
    wrapperStyles = useMemo(() => ({ disabled: !chunkLength || !bounds.length }), [
      chunkLength,
      bounds,
    ])

  return (
    <Horizontal styles={wrapperStyles}>
      <HeaderContent>
        <Icon scale={1.25} name="loop" />
        <span>&nbsp;Loop</span>
      </HeaderContent>
      {options.map((n) => (
        <WideLoopButton
          key={n}
          style={{ fontWeight: 'bold' }}
          params={{
            trackIndex,
            loop: n,
          }}
          onClick={() => dispatch(Actions.loopTrack({ trackId: props.trackId, loop: n }))}
        >
          {n}
        </WideLoopButton>
      ))}
      <FillLoopButton
        params={{
          trackIndex,
          loop: -1,
        }}
        onClick={() => dispatch(Actions.loopTrack({ trackId: props.trackId, loop: -1 }))}
      >
        <Icon name="next" />
        &nbsp;to end
      </FillLoopButton>
    </Horizontal>
  )
})

export default Loop
