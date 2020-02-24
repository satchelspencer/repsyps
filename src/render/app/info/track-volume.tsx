import React, { memo } from 'react'
import * as _ from 'lodash'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'

import ControlAdder from 'render/components/control-adder'
import Volume from 'render/components/volume'
import SidebarItem from './item'

export interface TrackVolumeProps {
  trackId: string
}

const TrackVolume = (props: TrackVolumeProps) => {
  const trackSourcesParams = useSelector(
      state => state.scenes.tracks[props.trackId].playback.trackSourcesParams
    ),
    source = useSelector(state => state.sources[props.trackId]),
    dispatch = useDispatch()

  return (
    <>
      {_.keys(source.trackSources).map(trackSourceId => {
        const trackSourceParams = trackSourcesParams[trackSourceId],
          { name } = source.trackSources[trackSourceId]
        return (
          <SidebarItem
            key={trackSourceId}
            title={
              <>
                <span>{name}</span>
                <Volume
                  volume={trackSourceParams.volume}
                  onChange={v =>
                    dispatch(
                      Actions.setTrackSourceParams({
                        trackId: props.trackId,
                        trackSourceId,
                        trackSourceParams: { volume: v },
                      })
                    )
                  }
                />
                <ControlAdder
                  name={name + ' - ' + source.name}
                  params={{
                    trackId: props.trackId,
                    trackSourceId,
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
