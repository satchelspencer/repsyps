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
  sourceId: string
}

const Separate = memo((props: SeparateProps) => {
  const getMappedState = useCallback(
      (state: Types.State) => {
        const source = state.sources[props.sourceId]
        return {
          name: source && source.name,
          bounds: source && source.bounds,
        }
      },
      [props.sourceId]
    ),
    { name, bounds } = useMappedState(getMappedState),
    dispatch = useDispatch(),
    handleSeparate = useCallback(() => {
      dispatch(
        Actions.setSourcePlayback({
          sourceId: props.sourceId,
          playback: { playing: false },
        })
      )

      const [vocal, instru] = _.chunk(audio.separateSource(getBuffer(props.sourceId)), 2)

      createBuffer(props.sourceId + '_vocal', vocal)
      dispatch(
        Actions.setSourceTrack({
          sourceId: props.sourceId,
          trackSourceId: props.sourceId + '_vocal',
          trackSource: {
            name: 'Vocal',
            volume: 0,
          },
        })
      )

      createBuffer(props.sourceId + '_instru', instru)
      dispatch(
        Actions.setSourceTrack({
          sourceId: props.sourceId,
          trackSourceId: props.sourceId + '_instru',
          trackSource: {
            name: 'Instru',
            volume: 0,
          },
        })
      )
    }, [props.sourceId, name])

  return (
    <SidebarItem
      title={
        <>
          <HeaderContent>
            <Icon name="cut" />
            <span>&nbsp;Source Separation</span>
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
