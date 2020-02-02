import React, { useState, useCallback } from 'react'
import { keyframes } from 'react-emotion'
import ctyled, { inline, active } from 'ctyled'
import { useMappedState, useDispatch } from 'redux-react-hook'

import { getValueControlIndex } from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import * as Types from 'lib/types'
import uid from 'lib/uid'

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
  sourceId: string
  prop: Types.ValueProp
  trackSourceId: string
  name: string
}

export default function Control(props: ControlProps) {
  const getMappedState = useCallback(
      (state: Types.State) => {
        const controlIndex = getValueControlIndex(
          state,
          props.sourceId,
          props.trackSourceId,
          props.prop
        )
        return {
          controlIndex,
          control: state.controls.values[controlIndex] as Types.ValueControl,
        }
      },
      [props.sourceId, props.prop]
    ),
    { control, controlIndex } = useMappedState(getMappedState),
    dispatch = useDispatch()

  return (
    <ControlWrapper
      waiting={false}
      enabled={!!control}
      onClick={() => {
        if (!control)
          dispatch(
            Actions.addValueControl({
              control: {
                sourceId: props.sourceId,
                prop: props.prop,
                trackSourceId: props.trackSourceId,
                name: props.name
              },
            })
          )
        else dispatch(Actions.deleteValueControl(controlIndex))
      }}
    />
  )
}
