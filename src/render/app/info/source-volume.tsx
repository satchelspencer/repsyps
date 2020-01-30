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
        return state.sources[props.sourceId] && state.sources[props.sourceId].trackSources
      },
      [props.sourceId]
    ),
    sources = useMappedState(getMappedState),
    dispatch = useDispatch()

  return (
    <>
      {!!sources &&
        _.keys(sources).map(trackSourceId => {
          const trackSource = sources[trackSourceId]
          return (
            <SidebarItem
              key={trackSourceId}
              title={
                <>
                  <span>{trackSource.name}</span>
                  <Volume
                    volume={trackSource.volume}
                    onChange={v =>
                      dispatch(
                        Actions.setSourceTrack({
                          sourceId: props.sourceId,
                          trackSourceId,
                          trackSource: { volume: v },
                        })
                      )
                    }
                  />
                  <Control sourceId={props.sourceId} trackSourceId={trackSourceId} prop="volume" />
                </>
              }
            />
          )
        })}
    </>
  )
}

export default SourceVolume
