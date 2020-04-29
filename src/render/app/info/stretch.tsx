import React, { memo, useCallback } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'

import Icon from 'render/components/icon'
import { HeaderContent, SelectableButton, Horizontal } from 'render/components/misc'

export interface StretchProps {
  trackId: string
}

const Stretch = memo((props: StretchProps) => {
  const { preservePitch } = useSelector(
      (state) => state.live.tracks[props.trackId].playback
    ),
    dispatch = useDispatch(),
    handleResample = useCallback(
      () =>
        dispatch(
          Actions.setTrackPlayback({
            trackId: props.trackId,
            playback: {
              preservePitch: false,
            },
          })
        ),
      [props.trackId]
    ),
    handlePreserve = useCallback(
      () =>
        dispatch(
          Actions.setTrackPlayback({
            trackId: props.trackId,
            playback: {
              preservePitch: true,
            },
          })
        ),
      [props.trackId]
    )

  return (
    <Horizontal>
      <HeaderContent>
        <Icon scale={1} name="stretch" />
        <span>&nbsp;Preserve Pitch</span>
      </HeaderContent>
      <SelectableButton selected={!preservePitch} onClick={handleResample}>
        off
      </SelectableButton>
      <SelectableButton selected={preservePitch} onClick={handlePreserve}>
        on
      </SelectableButton>
    </Horizontal>
  )
})

export default memo(Stretch)
