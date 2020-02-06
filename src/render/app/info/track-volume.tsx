import React, { useCallback } from 'react'
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
          tracks: track && track.trackChannels,
          name: track && track.name,
        }
      },
      [props.trackId]
    ),
    { tracks, name } = useMappedState(getMappedState),
    dispatch = useDispatch()

  return (
    <>
      {!!tracks &&
        _.keys(tracks).map(trackChannelId => {
          const trackChannel = tracks[trackChannelId]
          return (
            <SidebarItem
              key={trackChannelId}
              title={
                <>
                  <span>{trackChannel.name}</span>
                  <Volume
                    volume={trackChannel.volume}
                    onChange={v =>
                      dispatch(
                        Actions.setTrackChannels({
                          trackId: props.trackId,
                          trackChannelId,
                          trackChannel: { volume: v },
                        })
                      )
                    }
                  />
                  <ControlAdder
                    name={trackChannel.name + ' - ' + name}
                    params={{
                      trackId: props.trackId,
                      trackChannelId,
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

export default TrackVolume
