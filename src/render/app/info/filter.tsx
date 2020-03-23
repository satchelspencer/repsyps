import React, { memo, useMemo, useCallback } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import mappings from 'render/util/mappings'

import Icon from 'render/components/icon'
import { HeaderContent, SliderWrapper, ItemAdder } from 'render/components/misc'
import Slider from 'render/components/slider'

import SidebarItem from 'render/components/item'

export interface FilterProps {
  trackId: string
}

const center = mappings.filter.toStandard(0.5)

const Filter = memo((props: FilterProps) => {
  const filter = useSelector(state => state.live.tracks[props.trackId].playback.filter),
    name = useSelector(state => state.sources[props.trackId].name),
    getTrackIndex = useMemo(() => Selectors.makeGetTrackIndex(), []),
    trackIndex = useSelector(state => getTrackIndex(state, props.trackId)),
    dispatch = useDispatch(),
    setFilter = useCallback(
      value => {
        dispatch(
          Actions.setTrackPlayback({
            trackId: props.trackId,
            playback: { filter: mappings.filter.fromStandard(value) },
          })
        )
      },
      [props.trackId, name]
    )

  return (
    <SidebarItem
      title={
        <ItemAdder
          params={{
            trackIndex,
            trackProp: 'filter',
          }}
        >
          <HeaderContent>
            <Icon styles={{ size: s => s * 1.2 }} name="spectrum" />
            <span>&nbsp;Filter</span>
          </HeaderContent>
          <SliderWrapper styles={{ size: s => s * 1 }}>
            <Slider
              value={mappings.filter.toStandard(filter)}
              onChange={setFilter}
              markers={[center]}
            />
          </SliderWrapper>
        </ItemAdder>
      }
    />
  )
})

export default Filter
