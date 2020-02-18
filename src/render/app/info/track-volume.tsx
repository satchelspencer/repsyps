import React, { memo, useCallback } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'

import ControlAdder from 'render/components/control-adder'
import Volume from 'render/components/volume'
import SidebarItem from './item'

export interface TrackVolumeProps {
  trackId: string
}

const TrackVolume = (props: TrackVolumeProps) => {
  const getMappedState = useCallback(
      (state: Types.State) => {
        const track = state.tracks[props.trackId]
        return {
          sources: track && track.playback.sources,
          name: track && track.name,
        }
      },
      [props.trackId]
    ),
    { sources, name } = useMappedState(getMappedState),
    dispatch = useDispatch()

  return (
    <>
      {!!sources &&
        _.keys(sources).map(sourceId => {
          const trackSource = sources[sourceId]
          return (
            <SidebarItem
              key={sourceId}
              title={
                <>
                  <span>{trackSource.name}</span>
                  <Volume
                    volume={trackSource.volume}
                    onChange={v =>
                      dispatch(
                        Actions.setTrackSource({
                          trackId: props.trackId,
                          sourceId,
                          trackSource: { volume: v },
                        })
                      )
                    }
                  />
                  <ControlAdder
                    name={trackSource.name + ' - ' + name}
                    params={{
                      trackId: props.trackId,
                      sourceId,
                      prop: 'volume',
                    }}
                    type="value"
                  />
                </>
              }
            />
          )
        })}
    </>
  )
}

export default memo(TrackVolume)