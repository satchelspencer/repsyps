import React, { memo, useCallback } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import mappings from 'render/util/mappings'

import ControlAdder from 'render/components/control-adder'
import Icon from 'render/components/icon'
import { HeaderContent, SliderWrapper } from 'render/components/misc'
import Slider from 'render/components/slider'

import SidebarItem from './item'

export interface FilterProps {
  trackId: string
}

const center = mappings.filter.toStandard(0.5)

const Filter = memo((props: FilterProps) => {
  const filter = useSelector(state => state.live.tracks[props.trackId].playback.filter),
    name = useSelector(state => state.sources[props.trackId].name),
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
        <>
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
          <ControlAdder
            name={'Filter - ' + name}
            params={{
              trackId: props.trackId,
              prop: 'filter',
            }}
            type="value"
          />
        </>
      }
    />
  )
})

export default Filter
