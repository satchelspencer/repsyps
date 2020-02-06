import React, { memo, useCallback } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'
import { keyframes } from 'react-emotion'
import ctyled, { active } from 'ctyled'

import * as Types from 'render/util/types'
import uid from 'render/util/uid'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import mappings from 'render/redux/mappings'

import Slider from 'render/components/slider'
import Icon from 'render/components/icon'

const ControlsWrapper = ctyled.div.styles({
  height: '30%',
  flex: 'none',
  color: c => c.nudge(0),
  bg: true,
}).extendSheet`
  height:100%;
  border-top:2px solid ${({ color }) => color.bq} !important;
`

const ValueControl = ctyled.div.styles({
  bg: true,
  width: 5,
  color: c => c.contrast(0.05),
  borderColor: c => c.contrast(-0.175),
  gutter: 1,
  padd: 2,
  justify: 'space-between',
}).extendSheet`
  height:100%;
  overflow:hidden;
`

const ValueControlTitle = ctyled.div.styles({
  width: 1.3,
}).extendSheet`
  writing-mode: vertical-rl;
  text-orientation: mixed;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TitleInner = ctyled.div.styles({ flex: 'none' }).extendSheet`
position:absolute;
height:100%;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
    display: block;
`

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

const ValuesWrapper = ctyled.div.styles({
  flex: '1 0 0',
  column: true,
  lined: true,
  borderColor: c => c.contrast(-0.175),
}).extend`
overflow-x: scroll;
height: 100%;
`

const ValueControls = ctyled.div.styles({
  flex: 1,
  lined: true,
  endLine: true,
  borderColor: c => c.contrast(-0.175),
}).extendSheet`min-width: max-content;`

const ValueBindings = ctyled.div.styles({
  lined: true,
  endLine: true,
  bg: true,
  bgColor: c => c.contrast(0.07),
  height: 2.5,
}).extendSheet`min-width: max-content;`

const NotesWrapper = ctyled.div.styles({
  flex: '0.75 0 0',
  lined: true,
}).extendSheet`
  border-left:2px solid ${({ color }) => color.bq} !important;
  overflow-y:scroll;
  height: 100%;
`

const NoteControls = ctyled.div.styles({
  column: true,
  lined: true,
  endLine: true,
  borderColor: c => c.contrast(-0.2),
  flex: 1,
}).extendSheet`min-height: max-content;`

const NoteBindings = ctyled.div.styles({
  lined: true,
  endLine: true,
  bg: true,
  column: true,
  bgColor: c => c.contrast(0.07),
  width: 5,
}).extendSheet`min-height: max-content;`

const NoteControl = ctyled.div.styles({
  height: 2.5,
  color: c => c.contrast(0.1),
})

const NoteControlInner = ctyled.div.class(active).styles({
  bg: true,
  align: 'center',
  padd: 1.5,
  gutter: 1.5,
  hover: true,
  flex: 1,
})

const NoteControlName = ctyled.div.styles({
  flex: 1,
  height: 1.4,
})

const NameInner = ctyled.div.styles({
  flex: 'none',
}).extendSheet`
position:absolute;
width:100%;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
    display: block;
`

const NoteControlPad = ctyled.div.styles({
  bg: true,
  rounded: 2,
  color: c => c.nudge(0.15),
  width: 1.5,
  height: 1.5,
  border: true,
  borderColor: c => c.contrast(-0.2),
})

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

interface BindingControllerProps {
  x: number
  type: Types.BindingType
  bindings: Types.Bindings
}

function BindingController(props: BindingControllerProps) {
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

interface BindingAdderProps {
  x: number
  type: Types.BindingType
}

function BindingAdder(props: BindingAdderProps) {
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

export default function ControlsContainer() {
  const getMappedState = useCallback((state: Types.State) => {
      return {
        controls: state.controls,
        bindings: state.bindings,
        values: _.mapValues(state.controls, control => {
          if (control.type === 'value')
            return Selectors.getValueControlValue(state, control)
          else return 0
        }),
      }
    }, []),
    { controls, bindings, values } = useMappedState(getMappedState)
  return <Controls {...{ controls, bindings, values }} />
}

export interface ControlsProps {
  controls: Types.Controls
  bindings: Types.Bindings
  values: any
}

const Controls = memo((props: ControlsProps) => {
  const dispatch = useDispatch(),
    { controls, bindings, values } = props,
    corbs = _.values({ ...controls, ...bindings }),
    maxValueX =
      _.max(corbs.filter(corb => corb.type === 'value').map(c => c.position.x + 1)) || 0,
    maxNoteX =
      _.max(corbs.filter(corb => corb.type === 'note').map(c => c.position.x + 1)) || 0

  return (
    <ControlsWrapper>
      <ValuesWrapper>
        <ValueBindings>
          {_.range(maxValueX).map(x => (
            <BindingController key={x} x={x} bindings={bindings} type="value" />
          ))}
          <BindingAdder x={maxValueX} type="value" />
        </ValueBindings>
        <ValueControls>
          {_.range(maxValueX).map(x => {
            const controlId = _.find(
                _.keys(controls),
                controlId =>
                  controls[controlId].position.x === x &&
                  controls[controlId].type === 'value'
              ),
              control = controls[controlId] as Types.ValueControl
            return (
              <ValueControl key={x}>
                {!!control && (
                  <>
                    <Slider
                      column
                      value={values[controlId]}
                      onChange={value =>
                        dispatch(
                          Actions.applyControl({
                            control,
                            value: mappings[control.prop].fromStandard(value),
                            function: 'control',
                          })
                        )
                      }
                    />
                    <ValueControlTitle>
                      <TitleInner>{control.name}</TitleInner>
                    </ValueControlTitle>
                  </>
                )}
              </ValueControl>
            )
          })}
        </ValueControls>
      </ValuesWrapper>
      <NotesWrapper>
        <NoteControls>
          {_.range(maxNoteX).map(x => {
            const controlId = _.find(
                _.keys(controls),
                controlId =>
                  controls[controlId].position.x === x &&
                  controls[controlId].type === 'note'
              ),
              control = controls[controlId]
            return (
              <NoteControl key={x}>
                {control && (
                  <NoteControlInner
                    onClick={() =>
                      dispatch(
                        Actions.applyControl({
                          control,
                          value: 127,
                          function: 'note-on',
                        })
                      )
                    }
                  >
                    <NoteControlPad />
                    <NoteControlName>
                      <NameInner>{control.name}</NameInner>
                    </NoteControlName>
                  </NoteControlInner>
                )}
              </NoteControl>
            )
          })}
        </NoteControls>
        <NoteBindings>
          {_.range(maxNoteX).map(x => (
            <BindingController key={x} x={x} bindings={bindings} type="note" />
          ))}
          <BindingAdder x={maxNoteX} type="note" />
        </NoteBindings>
      </NotesWrapper>
    </ControlsWrapper>
  )
})
