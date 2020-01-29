import React, { useCallback } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import * as Types from 'lib/types'
import * as Actions from 'render/redux/actions'

import Control from 'render/components/control'
import Volume from 'render/components/volume'
import SidebarItem from './item'
import Title from './title'
import BoundsControl from './bounds'

const SidebarWrapper = ctyled.div.styles({
  column: true,
  bg: true,
  color: c => c.nudge(-0.05),
  lined: true,
}).extendSheet`
  width:${({ size }) => size * 25}px;
`

const SourceDetailsWrapper = ctyled.div.styles({
  column: true,
  padd: true,
  gutter: 2,
})

export interface SourceVolumeProps {
  sourceId: string
}

function SourceVolume(props: SourceVolumeProps) {
  const getMappedState = useCallback(
      (state: Types.State) => {
        return state.sources[props.sourceId].playback.volume
      },
      [props.sourceId]
    ),
    volume = useMappedState(getMappedState),
    dispatch = useDispatch()

  return (
    <SidebarItem
      title={
        <>
          <Volume
            volume={volume}
            onChange={v =>
              dispatch(
                Actions.setSourcePlayback({
                  sourceId: props.sourceId,
                  playback: { volume: v },
                })
              )
            }
          />
          <Control sourceId={props.sourceId} prop='volume'/>
        </>
      }
    />
  )
}

export default function Sidebar() {
  const getMappedState = useCallback((state: Types.State) => {
      const selectedId = Object.keys(state.sources).filter(
        tid => state.sources[tid].selected
      )[0]
      return {
        sourceId: selectedId,
        source: selectedId && state.sources[selectedId],
      }
    }, []),
    { sourceId, source } = useMappedState(getMappedState),
    dispatch = useDispatch()

  return (
    <SidebarWrapper>
      {source && (
        <SourceDetailsWrapper>
          <Title name={source.name} icon="wave" />
          <BoundsControl sourceId={sourceId} />
          <SourceVolume  sourceId={sourceId} />
        </SourceDetailsWrapper>
      )}
    </SidebarWrapper>
  )
}
