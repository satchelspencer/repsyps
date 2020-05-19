import React, { memo, useMemo, useCallback } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import mappings from 'render/util/mappings'

import Icon from 'render/components/icon'
import {
  HeaderContent,
  SliderWrapper,
  ItemAdder,
  Horizontal,
} from 'render/components/misc'
import Slider from 'render/components/slider'

export interface DelayProps {
  trackId: string
}

const center = [mappings.filter.toStandard(0.5)]

const Delay = memo((props: DelayProps) => {
  const { delay, delayGain } = useSelector(
      (state) => state.live.tracks[props.trackId].playback
    ),
    getTrackPlayback = useMemo(() => Selectors.makeGetTrackPlayback(props.trackId), []),
    realPlayback = useSelector((state) => getTrackPlayback(state, props.trackId))
      .playback,
    name = useSelector((state) => state.sources[props.trackId].name),
    getTrackIndex = useMemo(() => Selectors.makeGetTrackIndex(), []),
    trackIndex = useSelector((state) => getTrackIndex(state, props.trackId)),
    dispatch = useDispatch(),
    setGain = useCallback(
      (value) => {
        dispatch(
          Actions.setTrackPlayback({
            trackId: props.trackId,
            playback: { delayGain: mappings.delayGain.fromStandard(value) },
          })
        )
      },
      [props.trackId, name]
    ),
    setDelay = useCallback(
      (value) => {
        dispatch(
          Actions.setTrackPlayback({
            trackId: props.trackId,
            playback: { delay: mappings.delay.fromStandard(value) },
          })
        )
      },
      [props.trackId, name]
    ),
    controlDelayParams = useMemo(
      () => ({
        trackIndex,
        trackProp: 'delay',
      }),
      [trackIndex]
    ),
    controlGainParams = useMemo(
      () => ({
        trackIndex,
        trackProp: 'delayGain',
      }),
      [trackIndex]
    )

  return (
    <Horizontal>
      <ItemAdder params={controlGainParams}>
        <HeaderContent>
          <Icon scale={1.1} name="echo" />
          <span>&nbsp;Echo</span>
        </HeaderContent>
        <SliderWrapper>
          <Slider
            value={mappings.delayGain.toStandard(delayGain)}
            ghost={mappings.delayGain.toStandard(realPlayback.delayGain)}
            onChange={setGain}
          />
        </SliderWrapper>
      </ItemAdder>
      <ItemAdder params={controlDelayParams}>
        <HeaderContent>
          <span>&nbsp;Delay</span>
        </HeaderContent>
        <SliderWrapper>
          <Slider
            value={mappings.delay.toStandard(delay)}
            ghost={mappings.delay.toStandard(realPlayback.delay)}
            onChange={setDelay}
            markers={center}
          />
        </SliderWrapper>
      </ItemAdder>
    </Horizontal>
  )
})

export default Delay
