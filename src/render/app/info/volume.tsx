import React, { useMemo, memo } from 'react'
import * as _ from 'lodash'

import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import { useSelector, useDispatch } from 'render/redux/react'

import Volume from 'render/components/volume'
import SidebarItem from 'render/components/item'
import {ItemAdder} from 'render/components/misc'

export interface TrackVolumeProps {
  trackId: string
}

function TrackVolume(props: TrackVolumeProps) {
  const volume = useSelector(state => state.live.tracks[props.trackId].playback.volume),
    getTrackIndex = useMemo(() => Selectors.makeGetTrackIndex(), []),
    trackIndex = useSelector(state => getTrackIndex(state, props.trackId)),
    dispatch = useDispatch()

  return (
    <SidebarItem
      title={
        <ItemAdder
          params={{
            trackIndex,
            trackProp: 'volume',
          }}
        >
          <Volume
            volume={volume}
            onChange={v =>
              dispatch(
                Actions.setTrackPlayback({
                  trackId: props.trackId,
                  playback: {
                    volume: v,
                  },
                })
              )
            }
          />
        </ItemAdder>
      }
    />
  )
}

export default memo(TrackVolume)
