import React, { memo, useEffect, useState, useCallback } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector, useStore } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Types from 'render/util/types'

import Icon from 'render/components/icon'
import { HeaderContent, SelectableButton, WideButton } from 'render/components/misc'

import SidebarItem from 'render/components/item'

export interface SyncProps {
  trackId: string
}

const Sync = memo((props: SyncProps) => {
  const { loop, aperiodic, chunks, chunkIndex } = useSelector(
    state => state.live.tracks[props.trackId].playback
  )
  useEffect(() => {
    if (chunkIndex !== -1) setIsLoop(!!chunks[chunkIndex + 1])
  }, [chunks, chunkIndex])

  const bounds = useSelector(state => state.sources[props.trackId].bounds),
    dispatch = useDispatch(),
    store = useStore(),
    [isLoop, setIsLoop] = useState(false),
    canSync = isLoop || bounds.length > 1,
    setAperiodic = useCallback(
      (aperiodic: boolean) => {
        const newPlayback: Partial<Types.TrackPlayback> = {
          aperiodic,
        }
        if (!aperiodic && !isLoop && bounds.length) {
          const sample = store.getState().timing.tracks[props.trackId],
            nextBoundIndex = _.findIndex(bounds, b => {
              return b >= sample
            }),
            boundIndex = nextBoundIndex - 1
          newPlayback.chunks = [
            bounds[boundIndex],
            bounds[nextBoundIndex] - bounds[boundIndex],
          ]
        }
        dispatch(
          Actions.setTrackPlayback({
            trackId: props.trackId,
            playback: newPlayback,
          })
        )
      },
      [props.trackId, isLoop]
    )

  return (
    <SidebarItem
      title={
        <>
          <HeaderContent>
            <Icon styles={{ size: s => s * 1.4 }} name="av-timer" />
            <span>&nbsp;Sync</span>
          </HeaderContent>
          <SelectableButton
            disabled={!canSync}
            onClick={() => setAperiodic(false)}
            selected={!aperiodic}
          >
            <Icon name="check" />
            &nbsp;on
          </SelectableButton>
          <SelectableButton onClick={() => setAperiodic(true)} selected={aperiodic}>
            <Icon name="close-thin" />
            &nbsp;off
          </SelectableButton>
          <SelectableButton
            styles={{ flex: 'none' }}
            disabled={!isLoop}
            onClick={() =>
              dispatch(
                Actions.setTrackPlayback({
                  trackId: props.trackId,
                  playback: {
                    loop: !loop,
                  },
                })
              )
            }
            selected={loop}
          >
            <Icon styles={{ size: s => s * 1.1 }} name={loop ? 'loop' : 'stop'} />
          </SelectableButton>
        </>
      }
    />
  )
})

export default memo(Sync)
