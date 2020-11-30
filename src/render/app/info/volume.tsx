import React, { useCallback, useMemo, memo } from 'react'
import * as _ from 'lodash'

import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import { useSelector, useDispatch } from 'render/redux/react'

import Volume from 'render/components/volume'
import SidebarItem from 'render/components/item'
import { ItemAdder } from 'render/components/misc'

export interface TrackVolumeProps {
  trackId: string
}

function TrackVolume(props: TrackVolumeProps) {
  const volume = useSelector((state) => state.live.tracks[props.trackId].playback.volume),
    getTrackPlayback = useMemo(() => Selectors.makeGetTrackPlayback(props.trackId), []),
    realVolume = useSelector((state) => getTrackPlayback(state, props.trackId)).playback.volume,
    getTrackIndex = useMemo(() => Selectors.makeGetTrackIndex(), []),
    trackIndex = useSelector((state) => getTrackIndex(state, props.trackId)),
    dispatch = useDispatch(),
    volumeControlParams = useMemo(
      () => ({
        trackId: props.trackId,
        trackProp: 'volume',
      }),
      [props.trackId]
    ),
    handleVolumeChange = useCallback(
      (v) =>
        dispatch(
          Actions.setTrackPlayback({
            trackId: props.trackId,
            playback: {
              volume: v,
            },
          })
        ),
      [props.trackId]
    )

  return (
    <SidebarItem
      title={
        <ItemAdder params={volumeControlParams}>
          <Volume volume={volume} real={realVolume} onChange={handleVolumeChange} />
        </ItemAdder>
      }
    />
  )
}

export default memo(TrackVolume)
