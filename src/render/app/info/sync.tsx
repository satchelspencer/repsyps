import React, { memo, useMemo, useEffect, useState, useCallback } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'

import Icon from 'render/components/icon'
import { HeaderContent, SelectableButton, Horizontal } from 'render/components/misc'
import { adder } from 'render/components/control-adder'

const SyncButton = adder(SelectableButton)

export interface SyncProps {
  trackId: string
}

const Sync = memo((props: SyncProps) => {
  const { loop, aperiodic, chunks, chunkIndex, alpha } = useSelector(
    (state) => state.live.tracks[props.trackId].playback
  )
  useEffect(() => {
    if (chunkIndex !== -1) setIsLoop(!!chunks[chunkIndex + 1])
  }, [chunks, chunkIndex])

  const { bounds, boundsAlpha } = useSelector((state) => state.sources[props.trackId]),
    dispatch = useDispatch(),
    getTrackIndex = useMemo(() => Selectors.makeGetTrackIndex(), []),
    trackIndex = useSelector((state) => getTrackIndex(state, props.trackId)),
    [isLoop, setIsLoop] = useState(false),
    canSync = isLoop || bounds.length > 1,
    setAperiodic = useCallback(
      (aperiodic: boolean) => {
        dispatch(
          Actions.setTrackSync({ trackId: props.trackId, sync: aperiodic ? 'off' : 'on' })
        )
      },
      [props.trackId, isLoop]
    ),
    handleLock = useCallback(() => {
      dispatch(Actions.setTrackSync({ trackId: props.trackId, sync: 'lock' }))
    }, [bounds, aperiodic, alpha, boundsAlpha]),
    handleSyncOff = useCallback(() => setAperiodic(false), [setAperiodic]),
    handleSyncOn = useCallback(() => setAperiodic(true), [setAperiodic]),
    lockParams = useMemo(() => ({ trackIndex, sync: 'lock' }), [trackIndex]),
    onParams = useMemo(() => ({ trackIndex, sync: 'on' }), [trackIndex]),
    offParams = useMemo(() => ({ trackIndex, sync: 'off' }), [trackIndex]),
    toggleLoop = useCallback(
      () =>
        dispatch(
          Actions.setTrackPlayback({
            trackId: props.trackId,
            playback: {
              loop: !loop,
            },
          })
        ),
      [props.trackId, loop]
    )

  return (
    <Horizontal>
      <HeaderContent>
        <Icon scale={1.4} name="av-timer" />
        <span>&nbsp;Sync</span>
      </HeaderContent>
      <SyncButton selected disabled={!canSync} params={lockParams} onClick={handleLock}>
        <Icon scale={1} name="crosshairs" />
        &nbsp;lock
      </SyncButton>
      <SyncButton
        disabled={!canSync}
        onClick={handleSyncOff}
        selected={!aperiodic}
        params={onParams}
      >
        <Icon name="check" />
        &nbsp;on
      </SyncButton>
      <SyncButton onClick={handleSyncOn} selected={aperiodic} params={offParams}>
        <Icon name="close-thin" />
        &nbsp;off
      </SyncButton>
      <SelectableButton compact disabled={!isLoop} onClick={toggleLoop} selected={loop}>
        <Icon scale={1.1} name={loop ? 'loop' : 'stop'} />
      </SelectableButton>
    </Horizontal>
  )
})

export default memo(Sync)
