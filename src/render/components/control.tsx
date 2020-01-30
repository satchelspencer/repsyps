import React, { useState, useCallback } from 'react'
import { keyframes } from 'react-emotion'
import ctyled, { inline, active } from 'ctyled'
import { useMappedState, useDispatch } from 'redux-react-hook'

import { getValueControlId } from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import * as Types from 'lib/types'
import uid from 'lib/uid'

const blink = keyframes`
  0% {
    background:rgba(255,0,0,0.65);
  }
  50% {
    background:rgba(255,0,0,0);
  }
  100% {
    background:rgba(255,0,0,0.65);
  }
`

const ControlWrapper = ctyled.div.attrs({ enabled: false, waiting: false }).styles({
  width: 1,
  height: 1,
  border: true,
  color: c => c.nudge(0.1),
}).extendSheet`
    border-radius:50%;
    ${(_, { enabled, waiting }) => enabled && !waiting && `background:rgba(255,0,0,0.65);`}
    ${(_, {  waiting }) => waiting && `animation: ${blink} 2s linear infinite;`}
  `

export interface ControlProps {
  sourceId: string
  prop: Types.ValueProp
  trackSourceId: string
}

export default function Control(props: ControlProps) {
  const getMappedState = useCallback(
      (state: Types.State) => {
        const controlId = getValueControlId(state, props.sourceId, props.trackSourceId, props.prop)
        return {
          controlId,
          control: state.controls[controlId] as Types.ValueControl,
        }
      },
      [props.sourceId, props.prop]
    ),
    { control, controlId } = useMappedState(getMappedState),
    dispatch = useDispatch()

  return (
    <ControlWrapper
      waiting={control && !control.midiId}
      enabled={!!control}
      onClick={() => {
        if (!control)
          dispatch(
            Actions.addValueControl({
              controlId: uid(), 
              control: {
                sourceId: props.sourceId,
                prop: props.prop,
                trackSourceId: props.trackSourceId
              },
            })
          )
        else dispatch(Actions.deleteControl(controlId))
      }}
    />
  )
}
