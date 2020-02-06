import React, { useState, useCallback } from 'react'
import { keyframes } from 'react-emotion'
import ctyled, { inline, active } from 'ctyled'
import { useMappedState, useDispatch } from 'redux-react-hook'

import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import * as Types from 'render/util/types'
import uid from 'render/util/uid'

const blink = keyframes`
  0% {
    opacity:1;
  }
  50% {
    opacity:0.3;
  }
  100% {
    opacity:1;
  }
`

const ControlWrapper = ctyled.div.attrs({ enabled: false, waiting: false }).styles({
  width: 1,
  height: 1,
  border: true,
  color: c => c.nudge(0.1),
}).extendSheet`
    border-radius:50%;
    ${({ color }, { enabled, waiting }) =>
      enabled && !waiting
        ? `background:rgba(255,0,0,0.65) !important;`
        : waiting
        ? `animation: ${blink} 2s linear infinite;`
        : `background:${color.bg};`}
  `

export interface ControlProps {
  name: string
  params: Partial<Types.Control>
  type: Types.BindingType
}

export default function ControlAdder(props: ControlProps) {
  const getMappedState = useCallback(
      (state: Types.State) => {
        const controlId = Selectors.getControlId(state, props.params)
        return {
          controlId,
          control: state.controls[controlId],
          insertPosition: Selectors.getOpenPosition(state, props.type),
        }
      },
      [props.params, props.type]
    ),
    { control, controlId, insertPosition } = useMappedState(getMappedState),
    dispatch = useDispatch()

  return (
    <ControlWrapper
      waiting={false}
      enabled={!!control}
      onClick={() => {
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
