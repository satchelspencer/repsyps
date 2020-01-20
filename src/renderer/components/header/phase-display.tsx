import React, { memo, useContext } from 'react'
import * as _ from 'lodash'
import ctyled, { CtyledContext } from 'ctyled'

const PhaseDisplayWrapper = ctyled.div.styles({
  width: 1.7,
  height: 1.7,
  color: c => c.contrast(0.1),
  align: 'center',
  justify: 'center',
})

const polar = (cx: number, cy: number, radius: number, angle: number) => ({
  x: cx + radius * Math.cos(angle - Math.PI / 2),
  y: cy + radius * Math.sin(angle - Math.PI / 2),
})

export interface PhaseDisplayProps {
  time: number
}

const PhaseDisplay = memo((props: PhaseDisplayProps) => {
  const radius = 40,
    x = 50,
    y = 50,
    startAngle = 0,
    endAngle = Math.PI * 2 * (props.time - Math.floor(props.time)),
    start = polar(x, y, radius, endAngle),
    end = polar(x, y, radius, startAngle),
    gt180 = endAngle - startAngle <= Math.PI ? '0' : '1',
    style = useContext(CtyledContext)

  return (
    <PhaseDisplayWrapper>
      <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 100 100">
        <path
          stroke={style.theme.color.nudge(0.2).bg}
          fill="none"
          strokeWidth="20"
          d="M 49.99930186829924 10.00000000609235 A 40 40 0 1 0 50 10"
        />
        <path
          fill="none"
          stroke="#ff0000a6"
          strokeWidth="20"
          d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${gt180} 0 ${end.x} ${end.y}`}
        />
      </svg>
    </PhaseDisplayWrapper>
  )
})

export default PhaseDisplay
