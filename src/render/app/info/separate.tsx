import React, { memo, useCallback } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'

import * as Types from 'lib/types'
import audio from 'lib/audio'
import * as Actions from 'render/redux/actions'
import { getBuffer } from 'render/redux/buffers'

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
          bounds: source && source.bounds
        }
      },
      [props.sourceId]
    ),
    { name, bounds } = useMappedState(getMappedState),
    dispatch = useDispatch(),
    handleSeparate = useCallback(() => {
      const [vocal, instru] = _.chunk(audio.separateSource(getBuffer(props.sourceId)), 2)

      dispatch(
        Actions.addSource({
          sourceId: props.sourceId + '_vocal',
          name: 'vocal: ' + name,
          channels: vocal,
          bounds: [...bounds]
        })
      )
      dispatch(
        Actions.addSource({
          sourceId: props.sourceId + '_instru',
          name: 'instru: ' + name,
          channels: instru,
          bounds: [...bounds]
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
