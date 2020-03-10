import React, { memo, useCallback } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'

import Icon from 'render/components/icon'
import { HeaderContent, SelectableButton } from 'render/components/misc'

import SidebarItem from './item'

export interface SyncProps {
  trackId: string
}

const Sync = memo((props: SyncProps) => {
  const { aperiodic, chunks, chunkIndex } = useSelector(
      state => state.live.tracks[props.trackId].playback
    ),
    dispatch = useDispatch(),
    canSync = !!chunks[chunkIndex + 1],
    setAperiodic = useCallback(
      (aperiodic: boolean) =>
        dispatch(
          Actions.setTrackPlayback({
            trackId: props.trackId,
            playback: {
              aperiodic,
            },
          })
        ),
      [props.trackId]
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
        </>
      }
    />
  )
})

export default Sync
