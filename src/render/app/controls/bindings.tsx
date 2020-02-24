import React from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'
import { keyframes } from 'react-emotion'

import { useDispatch } from 'render/redux/react'
import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'
import uid from 'render/util/uid'

import Icon from 'render/components/icon'

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

const ValueControlBinding = ctyled.div.attrs({ enabled: false, waiting: false }).styles({
  align: 'center',
  justify: 'center',
  padd: 1,
  bg: true,
  color: c => c.nudge(-0.07),
  width: 5,
}).extendSheet`
cursor:pointer;
  ${({ color }, { enabled, waiting }) =>
    enabled && !waiting
      ? `background:${color.bg};`
      : waiting
      ? `animation: ${blink} 2s ease infinite;`
      : `opacity:0.5;`}
`

const NoteBinding = ctyled.div.attrs({ enabled: false, waiting: false }).styles({
  align: 'center',
  justify: 'center',
  bg: true,
  height: 2.5,
  color: c => c.nudge(-0.07),
}).extendSheet`
cursor:pointer;
${({ color }, { enabled, waiting }) =>
  enabled && !waiting
    ? `background:${color.bg};`
    : waiting
    ? `animation: ${blink} 2s ease infinite;`
    : `opacity:0.5;`}
`

export interface BindingControllerProps {
  x: number
  type: Types.BindingType
  bindings: Types.Bindings
}

export function BindingController(props: BindingControllerProps) {
  const dispatch = useDispatch(),
    bindingId = _.find(
      _.keys(props.bindings),
      bindingId =>
        props.bindings[bindingId].position.x === props.x &&
        props.bindings[bindingId].type === props.type
    ),
    binding = props.bindings[bindingId],
    enabled = !!(binding && binding.note),
    Container = props.type === 'value' ? ValueControlBinding : NoteBinding

  return (
    <Container
      enabled={enabled}
      waiting={binding && binding.waiting}
      onClick={() => {
        if (bindingId) dispatch(Actions.removeBinding(bindingId))
        else
          dispatch(
            Actions.addBinding({
              bindingId: uid(),
              binding: {
                type: props.type,
                note: null,
                channel: null,
                function: null,
                waiting: !enabled,
                position: { x: props.x, y: props.type === 'value' ? 0 : 1 }, //for now
              },
            })
          )
      }}
    >
      {props.x + 1}
    </Container>
  )
}

export interface BindingAdderProps {
  x: number
  type: Types.BindingType
}

export function BindingAdder(props: BindingAdderProps) {
  const dispatch = useDispatch(),
    Container = props.type === 'value' ? ValueControlBinding : NoteBinding

  return (
    <Container
      enabled
      waiting={false}
      styles={{ bgColor: c => c.contrast(0.1) }}
      onClick={() =>
        dispatch(
          Actions.addBinding({
            bindingId: uid(),
            binding: {
              type: props.type,
              note: null,
              channel: null,
              function: null,
              waiting: true,
              position: { x: props.x, y: 0 },
            },
          })
        )
      }
    >
      <Icon name="add" styles={{ size: s => s * 1.3 }} />
    </Container>
  )
}
