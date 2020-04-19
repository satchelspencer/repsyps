import React, { memo, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

const PadWrapper = ctyled.div.attrs({ active: false }).styles({
  width: '50%',
  height: '50%',
  border: 2,
  rounded: 2,
  bg: true,
  borderColor: (c) => c.contrast(0.15),
  bgColor: (c, { active }) => c.nudge(active ? 0.1 : 0.025),
})

export interface PadProps {
  value: number
  onChange: (newValue: number) => any
}

function Pad(props: PadProps) {
  const { value, onChange } = props,
    handleMouseDown = useCallback(
      (e) => {
        e.stopPropagation()
        e.preventDefault()
        onChange(1 - value)
      },
      [value]
    ),
    handleMouseUp = useCallback(() => onChange(1 - value), [value])

  return (
    <PadWrapper
      active={value < 0.5}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    />
  )
}

export default memo(Pad)
