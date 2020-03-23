import React, { memo } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'

import Volume from 'render/components/volume'
import ControlAdder from 'render/components/control-adder'

const VolumeWrapper = ctyled.div.styles({
  align: 'center',
  gutter: 2,
  padd: 2,
  flex: 1,
})

const VolumeControl = memo(() => {
  const volume = useSelector(state => state.playback.volume),
    dispatch = useDispatch()

  return (
    <VolumeWrapper>
      <Volume
        volume={volume}
        onChange={v => dispatch(Actions.updatePlayback({ volume: v }))}
      />
      <ControlAdder params={{ globalProp: 'volume' }} />
    </VolumeWrapper>
  )
})

export default VolumeControl
