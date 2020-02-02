import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'
import { keyframes } from 'react-emotion'
import ctyled, { active } from 'ctyled'

import * as Types from 'lib/types'
import * as Actions from 'render/redux/actions'
import { getValueControlValue } from 'render/redux/selectors'

import Slider from 'render/components/slider'
import Icon from 'render/components/icon'

const ControlsWrapper = ctyled.div.styles({
  height: '30%',
  flex: 'none',
  color: c => c.nudge(0),
  bg: true,
}).extendSheet`
  height:100%;
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
  width: 1,
}).extendSheet`
  writing-mode: vertical-rl;
  text-orientation: mixed;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

const CuesWrapper = ctyled.div.styles({
  flex: '0.75 0 0',
  lined: true,
}).extendSheet`
  border-left:4px solid ${({ color }) => color.bq} !important;
  overflow-y:scroll;
  height: 100%;
`

const CueControls = ctyled.div.styles({
  column: true,
  lined: true,
  endLine: true,
  borderColor: c => c.contrast(-0.2),
  flex: 1,
}).extendSheet`min-height: max-content;`

const CueBindings = ctyled.div.styles({
  lined: true,
  endLine: true,
  bg: true,
  column: true,
  bgColor: c => c.contrast(0.07),
  width: 5,
}).extendSheet`min-height: max-content;`

const CueControl = ctyled.div.styles({
  height: 2.5,
  color: c => c.contrast(0.1),
})

const CueControlInner = ctyled.div.class(active).styles({
  bg: true,
  align: 'center',
  padd: 1.5,
  gutter: 1.5,
  hover: true,
  flex: 1,
})

const CueControlName = ctyled.div.styles({
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

const CueControlPad = ctyled.div.styles({
  bg: true,
  rounded: 2,
  color: c => c.nudge(0.15),
  width: 1.5,
  height: 1.5,
  border: true,
  borderColor: c => c.contrast(-0.2),
})

const CueBinding = ctyled.div.attrs({ enabled: false, waiting: false }).styles({
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

export default function Controls() {
  const getMappedState = useCallback((state: Types.State) => {
      return {
        controls: state.controls,
        bindings: state.bindings,
        values: state.controls.values.map(control =>
          getValueControlValue(state, control)
        ),
      }
    }, []),
    dispatch = useDispatch(),
    { controls, bindings, values } = useMappedState(getMappedState),
    maxValueCount = Math.max(
      controls.values.length,
      _.findLastIndex(bindings.values, a => !!(a.note || a.waiting)) + 1
    ),
    maxCueCount = Math.max(
      controls.cues.length,
      _.findLastIndex(bindings.cues, a => !!(a.note || a.waiting)) + 1
    )

  return (
    <ControlsWrapper>
      <ValuesWrapper>
        <ValueBindings>
          {_.range(maxValueCount).map(index => {
            const binding = bindings.values[index],
              enabled = !!(binding && binding.note)

            return (
              <ValueControlBinding
                enabled={enabled}
                waiting={binding && binding.waiting}
                key={index}
                onClick={() =>
                  dispatch(
                    Actions.setValueBinding({
                      index,
                      binding: { note: null, channel: null, waiting: !enabled },
                    })
                  )
                }
              >
                {index + 1}
              </ValueControlBinding>
            )
          })}
          <ValueControlBinding
            enabled
            waiting={false}
            styles={{ bgColor: c => c.contrast(0.1) }}
            onClick={() =>
              dispatch(
                Actions.setValueBinding({
                  index: maxValueCount,
                  binding: {
                    note: null,
                    channel: null,
                    waiting: true,
                  },
                })
              )
            }
          >
            <Icon name="add" styles={{ size: s => s * 1.3 }} />
          </ValueControlBinding>
        </ValueBindings>
        <ValueControls>
          {_.range(maxValueCount).map(index => {
            const control = controls.values[index]
            return (
              <ValueControl key={index}>
                {control && (
                  <>
                    <Slider
                      column
                      value={values[index]}
                      onChange={value =>
                        dispatch(Actions.updateValueControlValue(control, value))
                      }
                    />
                    <ValueControlTitle>{control.name}</ValueControlTitle>
                  </>
                )}
              </ValueControl>
            )
          })}
        </ValueControls>
      </ValuesWrapper>
      <CuesWrapper>
        <CueControls>
          {_.range(maxCueCount).map(index => {
            const control = controls.cues[index]
            return (
              <CueControl key={index}>
                {control && (
                  <CueControlInner
                    onClick={() => dispatch(Actions.playbackCueControl(control))}
                  >
                    <CueControlPad />
                    <CueControlName>
                      <NameInner>{control.name}</NameInner>
                    </CueControlName>
                  </CueControlInner>
                )}
              </CueControl>
            )
          })}
        </CueControls>
        <CueBindings>
          {_.range(maxCueCount).map(index => {
            const binding = bindings.cues[index],
              enabled = !!(binding && binding.note)
            return (
              <CueBinding
                enabled={enabled}
                waiting={binding && binding.waiting}
                key={index}
                onClick={() =>
                  dispatch(
                    Actions.setCueBinding({
                      index,
                      binding: { note: null, channel: null, waiting: !enabled },
                    })
                  )
                }
              >
                {index + 1}
              </CueBinding>
            )
          })}
          <CueBinding
            enabled
            waiting={false}
            styles={{ bgColor: c => c.contrast(0.1) }}
            onClick={() =>
              dispatch(
                Actions.setCueBinding({
                  index: maxCueCount,
                  binding: {
                    note: null,
                    channel: null,
                    waiting: true,
                  },
                })
              )
            }
          >
            <Icon name="add" styles={{ size: s => s * 1.3 }} />
          </CueBinding>
        </CueBindings>
      </CuesWrapper>
    </ControlsWrapper>
  )
}
