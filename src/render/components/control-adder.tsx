import React, { useState, useCallback } from 'react'
import { keyframes } from 'react-emotion'
import ctyled, { inline, active } from 'ctyled'
import { useMappedState, useDispatch } from 'redux-react-hook'

import * as Selectors from 'render/redux/selectors'
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

// export interface ControlProps {
//   sourceId: string
//   prop: Types.TrackValueProp
//   trackSourceId: string
//   name: string
// }

// export default function Control(props: ControlProps) {
//   const getMappedState = useCallback(
//       (state: Types.State) => {
//         const controlId = Selectors.getValueControlId(
//           state,
//           props.sourceId,
//           props.trackSourceId,
//           props.prop
//         )
//         return {
//           controlId,
//           control: state.controls[controlId] as Types.TrackValueControl,
//           insertPosition: Selectors.getOpenPosition(state, 'value'),
//         }
//       },
//       [props.sourceId, props.prop]
//     ),
//     { control, controlId, insertPosition } = useMappedState(getMappedState),
//     dispatch = useDispatch()

//   return (
//     <ControlWrapper
//       waiting={false}
//       enabled={!!control}
//       onClick={() => {
//         if (!control)
//           dispatch(
//             Actions.addControl({
//               controlId: uid(),
//               control: {
//                 type: 'value',
//                 sourceId: props.sourceId,
//                 prop: props.prop,
//                 trackSourceId: props.trackSourceId,
//                 name: props.name,
//                 position: insertPosition,
//               },
//             })
//           )
//         else dispatch(Actions.removeControl(controlId))
//       }}
//     />
//   )
// }

// export interface CueControlProps {
//   sourceId: string
//   cueIndex: number
//   name: string
// }

// export function CueControl(props: CueControlProps) {
//   const getMappedState = useCallback(
//       (state: Types.State) => {
//         const controlId = Selectors.getCueControlId(state, props.sourceId, props.cueIndex)
//         return {
//           controlId,
//           control: state.controls[controlId] as Types.CueControl,
//           insertPosition: Selectors.getOpenPosition(state, 'note'),
//         }
//       },
//       [props.sourceId, props.cueIndex]
//     ),
//     { control, controlId, insertPosition } = useMappedState(getMappedState),
//     dispatch = useDispatch()

//   return (
//     <ControlWrapper
//       waiting={false}
//       enabled={!!control}
//       onClick={() => {
//         if (!control)
//           dispatch(
//             Actions.addControl({
//               controlId: uid(),
//               control: {
//                 type: 'note',
//                 sourceId: props.sourceId,
//                 cueIndex: props.cueIndex,
//                 name: props.name,
//                 position: insertPosition,
//               },
//             })
//           )
//         else dispatch(Actions.removeControl(controlId))
//       }}
//     />
//   )
// }

// export interface GlobalControlProps {
//   prop: string
//   name: string
// }

// export function GlobalControl(props: GlobalControlProps) {
//   const getMappedState = useCallback(
//       (state: Types.State) => {
//         const controlId = Selectors.getGlobalControlId(state, props.prop)
//         return {
//           controlId,
//           control: state.controls[controlId] as Types.GlobalValueControl,
//           insertPosition: Selectors.getOpenPosition(state, 'value'),
//         }
//       },
//       [props.prop]
//     ),
//     { control, controlId, insertPosition } = useMappedState(getMappedState),
//     dispatch = useDispatch()

//   return (
//     <ControlWrapper
//       waiting={false}
//       enabled={!!control}
//       onClick={() => {
//         if (!control)
//           dispatch(
//             Actions.addControl({
//               controlId: uid(),
//               control: {
//                 global: true,
//                 type: 'value',
//                 name: props.name,
//                 prop: props.prop,
//                 position: insertPosition,
//               } as Types.Control,
//             })
//           )
//         else dispatch(Actions.removeControl(controlId))
//       }}
//     />
//   )
// }

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
