import React, { memo } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'

import Volume from 'render/components/volume'
import { adder } from 'render/components/control-adder'

const VolumeWrapper = adder(
  ctyled.div.styles({
    align: 'center',
    gutter: 2,
    padd: 2,
    flex: 1,
  })
)

const volumeParams = { globalProp: 'volume' }

const VolumeControl = memo(() => {
  const volume = useSelector(state => state.playback.volume),
    dispatch = useDispatch()

  return (
    <VolumeWrapper params={volumeParams}>
      <Volume
        volume={volume}
        onChange={v => dispatch(Actions.updatePlayback({ volume: v }))}
      />
    </VolumeWrapper>
  )
})

export default VolumeControl
