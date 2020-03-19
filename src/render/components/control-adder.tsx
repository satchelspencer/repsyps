import React from 'react'
import ctyled from 'ctyled'

import * as Types from 'render/util/types'
import { useSelectable } from 'render/components/selection'

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
}

export default function ControlAdder(props: ControlProps) {
  const { isSelecting, onSelect } = useSelectable<Partial<Types.Control>>('control')
  return (
    <ControlWrapper
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
