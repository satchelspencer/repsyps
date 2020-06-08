import React, { memo, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

const PadWrapper = ctyled.div.attrs({ active: false }).styles({
  width: '50%',
  height: '50%',
  rounded: 2,
  bg: true,
  borderColor: (c) => c.contrast(0.15),
  bgColor: (c, { active }) => c.nudge(active ? 0.1 : 0.025),
}).extendSheet`
  border:${({ size, borderColor }) => `${size / 6}px solid ${borderColor.bq}`};
`

export interface PadProps {
  value: number
  onChange: (newValue: number) => any
}

function Pad(props: PadProps) {
  const { value, onChange } = props,
    handleToggle = useCallback(() => onChange(1 - value), [value])

  return (
    <PadWrapper
      active={value < 0.5}
      onMouseDown={handleToggle}
      onMouseUp={handleToggle}
    />
  )
}

export default memo(Pad)
