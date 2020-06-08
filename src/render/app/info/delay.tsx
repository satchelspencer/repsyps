import React, { memo, useMemo, useCallback } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import * as mappings from 'render/util/mappings'

import Icon from 'render/components/icon'
import {
  HeaderContent,
  SliderWrapper,
  ItemAdder,
  WideButton,
} from 'render/components/misc'
import Slider from 'render/components/slider'
import SidebarItem from 'render/components/item'

export interface DelayProps {
  trackId: string
}

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
    period = useSelector((state) => state.playback).period,
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
    <SidebarItem
      open={true}
      title={
        <>
          <HeaderContent>
            <Icon name="echo" scale={1.1} />
            <span>&nbsp;Delay</span>
          </HeaderContent>
          <ItemAdder params={controlGainParams}>
            <SliderWrapper>
              <Slider
                value={mappings.delayGain.toStandard(delayGain)}
                ghost={mappings.delayGain.toStandard(realPlayback.delayGain)}
                onChange={setGain}
              />
            </SliderWrapper>
          </ItemAdder>
        </>
      }
    >
      <ItemAdder params={controlDelayParams}>
        <HeaderContent>
          <span>Length</span>
        </HeaderContent>
        <SliderWrapper>
          <Slider
            value={mappings.delay.toStandard(delay)}
            ghost={mappings.delay.toStandard(realPlayback.delay)}
            onChange={setDelay}
            markers={[0.25, 0.5]}
          />
        </SliderWrapper>
      </ItemAdder>
    </SidebarItem>
  )
})

export default Delay
