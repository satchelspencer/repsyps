import React, { useCallback } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'

import * as Types from 'lib/types'
import * as Actions from 'render/redux/actions'

import Control from 'render/components/control'
import Volume from 'render/components/volume'
import SidebarItem from './item'

export interface SourceVolumeProps {
  sourceId: string
}

const SourceVolume = (props: SourceVolumeProps) => {
  const getMappedState = useCallback(
      (state: Types.State) => {
        return state.sources[props.sourceId].playback.volume
      },
      [props.sourceId]
    ),
    volume = useMappedState(getMappedState),
    dispatch = useDispatch()

  return (
    <SidebarItem
      title={
        <>
          <Volume
            volume={volume}
            onChange={v =>
              dispatch(
                Actions.setSourcePlayback({
                  sourceId: props.sourceId,
                  playback: { volume: v },
                })
              )
            }
          />
          <Control sourceId={props.sourceId} prop="volume" />
        </>
      }
    />
  )
}

export default SourceVolume
