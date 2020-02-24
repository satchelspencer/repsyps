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
  const sourceTracksParams = useSelector(
      state => state.live.tracks[props.trackId].playback.sourceTracksParams
    ),
    source = useSelector(state => state.sources[props.trackId]),
    dispatch = useDispatch()

  return (
    <>
      {_.keys(source.sourceTracks).map(sourceTrackId => {
        const sourceTrackParams = sourceTracksParams[sourceTrackId],
          { name } = source.sourceTracks[sourceTrackId]
        return (
          <SidebarItem
            key={sourceTrackId}
            title={
              <>
                <span>{name}</span>
                <Volume
                  volume={sourceTrackParams.volume}
                  onChange={v =>
                    dispatch(
                      Actions.setTrackSourceParams({
                        trackId: props.trackId,
                        sourceTrackId,
                        sourceTrackParams: { volume: v },
                      })
                    )
                  }
                />
                <ControlAdder
                  name={name + ' - ' + source.name}
                  params={{
                    trackId: props.trackId,
                    sourceTrackId,
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
