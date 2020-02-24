import React, { useMemo } from 'react'
import ctyled from 'ctyled'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import * as Types from 'render/util/types'
import uid from 'render/util/uid'

const ControlWrapper = ctyled.div.attrs({ enabled: false }).styles({
  width: 1,
  height: 1,
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
  const getMatchingControl = useMemo(() => Selectors.makeGetMatchingControl(), []),
    getOpenPosition = useMemo(() => Selectors.makeGetOpenPosition(), [])

  const { controlId, control } = useSelector(state =>
      getMatchingControl(state, props.params)
    ),
    insertPosition = useSelector(state => getOpenPosition(state, props.type)),
    dispatch = useDispatch()

  return (
    <ControlWrapper
      enabled={!!control}
      onClick={e => {
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
