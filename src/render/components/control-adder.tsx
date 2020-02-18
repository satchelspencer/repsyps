import React, { useCallback } from 'react'
import ctyled from 'ctyled'
import { useMappedState, useDispatch } from 'redux-react-hook'

import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import * as Types from 'render/util/types'
import uid from 'render/util/uid'

const ControlWrapper = ctyled.div.attrs({ enabled: false }).styles({
  width: 0.8,
  height: 0.8,
  border: true,
  color: c => c.nudge(0.1),
}).extendSheet`
    border-radius:50%;
    ${({ color }, { enabled }) =>
      enabled ? `background:rgba(255,0,0,0.65) !important;` : `background:${color.bg};`}
  `

export interface ControlProps {
  name: string
  params: Partial<Types.Control>
  type: Types.BindingType
}

export default function ControlAdder(props: ControlProps) {
  const getMappedState = useCallback(
      (state: Types.State) => {
        const controlId = Selectors.getMatchingControlId(state, props.params)
        return {
          controlId,
          control: Selectors.getControls(state)[controlId],
          insertPosition: Selectors.getOpenPosition(state, props.type),
        }
      },
      [props.params, props.type]
    ),
    { control, controlId, insertPosition } = useMappedState(getMappedState),
    dispatch = useDispatch()

  return (
    <ControlWrapper
      enabled={!!control}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!control)
          dispatch(
            Actions.addControl({
              controlId: uid(),
              control: {
                type: props.type,
                name: props.name,
                position: insertPosition,
                ...props.params,
              } as Types.Control,
            })
          )
        else dispatch(Actions.removeControl(controlId))
      }}
    />
  )
}
