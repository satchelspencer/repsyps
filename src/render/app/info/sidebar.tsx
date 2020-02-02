import React, { useCallback, useMemo } from 'react'
import { useMappedState } from 'redux-react-hook'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import * as Types from 'lib/types'

import Title from './title'
import BoundsControl from './bounds'
import SourceVolume from './source-volume'
import Separate from './separate'
import AddCue from './addcue'

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

const Sidebar = () => {
  const getMappedState = useCallback((state: Types.State) => {
      const selectedId = Object.keys(state.sources).filter(
          tid => state.sources[tid].selected
        )[0],
        source = selectedId && state.sources[selectedId]
      return {
        sourceId: selectedId,
        sourceExists: !!source,
        name: source && source.name,
      }
    }, []),
    { sourceId, sourceExists, name } = useMappedState(getMappedState)

  return useMemo(
    () => (
      <SidebarWrapper>
        {sourceExists && (
          <SourceDetailsWrapper>
            <Title name={name} icon="wave" />
            <SourceVolume sourceId={sourceId} />
            <BoundsControl sourceId={sourceId} />
            <Separate sourceId={sourceId} />
            <AddCue sourceId={sourceId} />
          </SourceDetailsWrapper>
        )}
      </SidebarWrapper>
    ),
    [sourceId, sourceExists, name]
  )
}

export default Sidebar
