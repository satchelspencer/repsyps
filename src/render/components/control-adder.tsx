import React from 'react'
import ctyled from 'ctyled'

import * as Types from 'render/util/types'
import { useSelectable } from 'render/components/selection'

export const ControlAdderWrapper = ctyled.div.attrs({ enabled: false }).styles({
  width: 1,
  height: 1,
  color: c => c.nudge(0.1),
}).extendSheet`
    border-radius:50%;
    border:2px solid  ${({ color }, { enabled }) =>
      enabled ? `rgba(255,0,0,0.75)` : color.contrast(-0.15).bq};
    ${(_, { enabled }) =>
      enabled &&
      `
      &:hover{
        background:rgba(255,0,0,0.5);
      }
    `}
  `

export interface ControlProps {
  name: string
  params: Partial<Types.Control>
}

export default function ControlAdder(props: ControlProps) {
  const { isSelecting, onSelect } = useSelectable<Partial<Types.Control>>('control')
  return (
    <ControlAdderWrapper
      enabled={isSelecting}
      onClick={e => {
        if (isSelecting) {
          e.preventDefault()
          e.stopPropagation()
          onSelect(props.params)
        }
      }}
    />
  )
}
