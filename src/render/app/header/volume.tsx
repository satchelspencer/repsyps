import React, { memo } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'

import Volume from 'render/components/volume'

const VolumeControl = memo(() => {
  const volume = useSelector(state => state.playback.volume),
    dispatch = useDispatch()

  return (
    <Volume
      volume={volume}
      onChange={v => dispatch(Actions.updatePlayback({ volume: v }))}
    />
  )
})

export default VolumeControl
