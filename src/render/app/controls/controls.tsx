import React from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useSelector } from 'render/redux/react'
import * as Types from 'render/util/types'
import * as Selectors from 'render/redux/selectors'

import NoteControls from './notes'
import ValueControls from './values'
import SceneControl from './scene-control'

const ControlsWrapper = ctyled.div.styles({
  height: '30%',
  flex: 'none',
  color: c => c.nudge(0),
  bg: true,
  column: true,
  lined: true,
}).extendSheet`
  height:100%;
`

const ControlsH = ctyled.div.styles({ flex: 1 })

export const TitleInner = ctyled.div.styles({ flex: 'none' }).extendSheet`
position:absolute;
height:100%;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
    display: block;
`

export interface ControlsProps {
  controls: Types.Controls
  bindings: Types.Bindings
  values: Types.ControlValues
  lastOfPrevIds: string[]
}

export default function ControlsContainer() {
  const { currentControls, lastControls } = useSelector(
      Selectors.getSeparatedCurrentControls
    ),
    bindings = useSelector(state => state.bindings),
    values = useSelector(Selectors.getCurrentValueControlsValues),
    cprops = {
      bindings,
      controls: {
        ...currentControls,
        ...lastControls,
      },
      lastOfPrevIds: _.keys(lastControls),
      values,
    }
  return (
    <ControlsWrapper>
      <SceneControl />
      <ControlsH>
        <ValueControls {...cprops} />
        <NoteControls {...cprops} />
      </ControlsH>
    </ControlsWrapper>
  )
}
