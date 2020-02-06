import React, { useCallback, memo } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'

import Volume from 'render/components/volume'

const VolumeControl = memo(() => {
  const getMappedState = useCallback((state: Types.State) => {
      return state.playback.volume
    }, []),
    volume = useMappedState(getMappedState),
    dispatch = useDispatch()

  return (
    <Volume
      volume={volume}
      onChange={v => dispatch(Actions.updatePlayback({ volume: v }))}
    />
  )
})

export default VolumeControl