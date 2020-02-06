import React, { memo, useCallback } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'

import * as Types from 'render/util/types'
import audio from 'render/util/audio'
import * as Actions from 'render/redux/actions'
import { getBuffer, createBuffer } from 'render/redux/buffers'

import Icon from 'render/components/icon'
import { WideButton, HeaderContent } from 'render/components/misc'

import SidebarItem from './item'

export interface SeparateProps {
  trackId: string
}

const Separate = memo((props: SeparateProps) => {
  const getMappedState = useCallback(
      (state: Types.State) => {
        const track = state.tracks[props.trackId]
        return {
          name: track && track.name,
          bounds: track && track.bounds,
        }
      },
      [props.trackId]
    ),
    { name, bounds } = useMappedState(getMappedState),
    dispatch = useDispatch(),
    handleSeparate = useCallback(() => {
      dispatch(
        Actions.setTrackPlayback({
          trackId: props.trackId,
          playback: { playing: false },
        })
      )

      const [vocal, instru] = _.chunk(audio.separateSource(getBuffer(props.trackId)), 2)

      createBuffer(props.trackId + '_vocal', vocal)
      dispatch(
        Actions.setTrackChannels({
          trackId: props.trackId,
          trackChannelId: props.trackId + '_vocal',
          trackChannel: {
            name: 'Vocal',
            volume: 0,
          },
        })
      )

      createBuffer(props.trackId + '_instru', instru)
      dispatch(
        Actions.setTrackChannels({
          trackId: props.trackId,
          trackChannelId: props.trackId + '_instru',
          trackChannel: {
            name: 'Instru',
            volume: 0,
          },
        })
      )
    }, [props.trackId, name])

  return (
    <SidebarItem
      title={
        <>
          <HeaderContent>
            <Icon name="cut" />
            <span>&nbsp;Track Separation</span>
          </HeaderContent>
          <WideButton styles={{ flex: 1 }} onClick={handleSeparate}>
            Separate
          </WideButton>
        </>
      }
    />
  )
})

export default Separate
