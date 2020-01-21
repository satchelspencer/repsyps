import React, { useState } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import Slider from './slider'
import Icon from 'render/components/icon'
import { SliderWrapper } from './misc'

const VolumeWrapper = ctyled.div.styles({
  align: 'center',
  gutter: 2,
  flex: 1,
})

export interface VolumeProps {
  volume: number
  onChange: (volume: number) => any
}

export default function Volume(props: VolumeProps) {
  const [muted, setMuted] = useState(false),
    [lastVolume, setLastVolume] = useState(1)

  return (
    <VolumeWrapper>
      <Icon
        styles={{ size: s => s * 1.6 }}
        asButton
        name={props.volume ? 'volume' : 'volume_mute'}
        onClick={() => {
          if (props.volume) {
            setLastVolume(props.volume)
            setMuted(true)
            props.onChange(0)
          } else {
            setMuted(false)
            props.onChange(lastVolume)
          }
        }}
      />
      <SliderWrapper style={{ opacity: muted ? 0.5 : 1 }}>
        <Slider
          value={(muted ? lastVolume : props.volume) * 0.75}
          onChange={v => {
            setMuted(false)
            props.onChange(v / 0.75)
          }}
          markers={[0.75]}
        />
      </SliderWrapper>
    </VolumeWrapper>
  )
}