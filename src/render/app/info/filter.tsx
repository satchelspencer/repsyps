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
  Horizontal,
} from 'render/components/misc'
import Slider from 'render/components/slider'

export interface FilterProps {
  trackId: string
}

const center = [mappings.filter.toStandard(0.5)]

const Filter = memo((props: FilterProps) => {
  const filter = useSelector((state) => state.live.tracks[props.trackId].playback.filter),
    getTrackPlayback = useMemo(() => Selectors.makeGetTrackPlayback(props.trackId), []),
    realFilter = useSelector((state) => getTrackPlayback(state, props.trackId)).playback
      .filter,
    getTrackIndex = useMemo(() => Selectors.makeGetTrackIndex(), []),
    trackIndex = useSelector((state) => getTrackIndex(state, props.trackId)),
    dispatch = useDispatch(),
    setFilter = useCallback(
      (value) => {
        dispatch(
          Actions.setTrackPlayback({
            trackId: props.trackId,
            playback: { filter: mappings.filter.fromStandard(value) },
          })
        )
      },
      [props.trackId]
    ),
    controlParams = useMemo(
      () => ({
        trackIndex,
        trackProp: 'filter',
      }),
      [trackIndex]
    )

  return (
    <Horizontal>
      <ItemAdder params={controlParams}>
        <HeaderContent>
          <Icon scale={1.2} name="spectrum" />
          <span>&nbsp;Filter</span>
        </HeaderContent>
        <SliderWrapper>
          <Slider
            value={mappings.filter.toStandard(filter)}
            ghost={mappings.filter.toStandard(realFilter)}
            onChange={setFilter}
            markers={center}
          />
        </SliderWrapper>
      </ItemAdder>
    </Horizontal>
  )
})

export default Filter
