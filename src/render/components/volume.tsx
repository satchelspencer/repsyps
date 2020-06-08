import React, { useState, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import * as mappings from 'render/util/mappings'
import Icon from 'render/components/icon'
import Slider from './slider'
import { SliderWrapper } from './misc'

const VolumeWrapper = ctyled.div.styles({
  align: 'center',
  gutter: 2,
  flex: 1,
})

export interface VolumeProps {
  volume: number
  real?: number
  noIcon?: boolean
  onChange: (volume: number) => any
}

const CENTER = [2 / 3]

export default function Volume(props: VolumeProps) {
  const [muted, setMuted] = useState(false),
    [lastVolume, setLastVolume] = useState(1),
    handleMute = useCallback(() => {
      if (props.volume) {
        setLastVolume(props.volume)
        setMuted(true)
        props.onChange(0)
      } else {
        setMuted(false)
        props.onChange(lastVolume)
      }
    }, [props.volume, props.onChange]),
    handleChange = useCallback(
      (v) => {
        setMuted(false)
        props.onChange(mappings.volume.fromStandard(v))
      },
      [props.onChange]
    )

  return (
    <VolumeWrapper>
      {!props.noIcon && (
        <Icon
          scale={1.3}
          asButton
          name={props.volume ? 'volume' : 'volume_mute'}
          onClick={handleMute}
        />
      )}
      <SliderWrapper>
        <Slider
          value={mappings.volume.toStandard(muted ? lastVolume : props.volume)}
          ghost={mappings.volume.toStandard(props.real)}
          onChange={handleChange}
          markers={CENTER}
        />
      </SliderWrapper>
    </VolumeWrapper>
  )
}
