import React, { memo, useCallback } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'

import * as Types from 'lib/types'
import * as Actions from 'render/redux/actions'

import Icon from 'render/components/icon'
import { WideButton, HeaderContent } from 'render/components/misc'

import SidebarItem from './item'

export interface AddCueProps {
  sourceId: string
}

const AddCue = memo((props: AddCueProps) => {
  const getMappedState = useCallback(
      (state: Types.State) => {
        const source = state.sources[props.sourceId]
        return {
          name: source && source.name,
          chunks: source && source.playback.chunks,
        }
      },
      [props.sourceId]
    ),
    { name, chunks } = useMappedState(getMappedState),
    dispatch = useDispatch(),
    handleAddCue = useCallback(() => {
      dispatch(
        Actions.addCueControl({
          control: {
            sourceId: props.sourceId,
            chunks,
            name: _.round(chunks[0] / 44100, 2) + 's'+' : '+name,
          },
        })
      )
    }, [props.sourceId, chunks, name])

  return (
    <SidebarItem
      title={
        <>
          <HeaderContent>
            <Icon name="midi" />
            <span>&nbsp;Playback Cue</span>
          </HeaderContent>
          <WideButton styles={{ flex: 1 }} onClick={handleAddCue}>
            Add Cue
          </WideButton>
        </>
      }
    />
  )
})

export default AddCue
