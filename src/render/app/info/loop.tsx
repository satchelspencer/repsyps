import React, { memo, useMemo, useCallback } from 'react'
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

interface LoopButtonProps {
  n: number
  trackIndex: number
  trackId: string
}

function LoopButton(props: LoopButtonProps) {
  const dispatch = useDispatch(),
    styles = useMemo(() => ({ fontWeight: 'bold' }), []),
    params = useMemo(
      () => ({
        trackIndex: props.trackIndex,
        loop: props.n,
      }),
      [props.n, props.trackIndex]
    ),
    handleClick = useCallback(
      () => dispatch(Actions.loopTrack({ trackId: props.trackId, loop: props.n })),
      [props.trackId, props.n]
    )
  return (
    <WideLoopButton style={styles} params={params} onClick={handleClick}>
      {props.n}
    </WideLoopButton>
  )
}

const Loop = memo((props: LoopProps) => {
  const { playback, sourceId } = useSelector((state) => state.live.tracks[props.trackId]),
    { chunks } = playback,
    bounds = useSelector((state) => state.sources[sourceId].bounds),
    getTrackIndex = useMemo(() => Selectors.makeGetTrackIndex(), []),
    trackIndex = useSelector((state) => getTrackIndex(state, props.trackId)),
    dispatch = useDispatch(),
    chunkLength = chunks[1],
    wrapperStyles = useMemo(() => ({ disabled: !chunkLength || !bounds.length }), [
      chunkLength,
      bounds,
    ]),
    toEndParams = useMemo(
      () => ({
        trackIndex,
        loop: -1,
      }),
      [trackIndex]
    ),
    playToEnd = useCallback(
      () => dispatch(Actions.loopTrack({ trackId: props.trackId, loop: -1 })),
      [props.trackId]
    )

  return (
    <Horizontal styles={wrapperStyles}>
      <HeaderContent>
        <Icon scale={1.25} name="loop" />
        <span>&nbsp;Loop</span>
      </HeaderContent>
      {options.map((n) => (
        <LoopButton key={n} n={n} trackIndex={trackIndex} trackId={props.trackId} />
      ))}
      <FillLoopButton params={toEndParams} onClick={playToEnd}>
        <Icon name="next" />
        &nbsp;to end
      </FillLoopButton>
    </Horizontal>
  )
})

export default Loop
