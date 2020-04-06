import React, { useContext, useEffect, useCallback, useState, useRef } from 'react'
import * as _ from 'lodash'
import ctyled, { CtyledContext } from 'ctyled'

const KnobWrapper = ctyled.div.styles({
  width: '50%',
  height: '50%',
})

const polar = (cx: number, cy: number, radius: number, angle: number) => ({
  x: cx + radius * Math.cos(angle),
  y: cy + radius * Math.sin(angle),
})

const value2angle = (val: number) => {
  const halfRatio = 0.8,
    max = Math.PI * halfRatio,
    min = -max

  return (max - min) * val + min - Math.PI / 2
}

const getD = (startValue: number, endValue: number, radius: number) => {
  const x = 50,
    y = 50,
    startAngle = value2angle(startValue),
    endAngle = value2angle(endValue),
    start = polar(x, y, radius, endAngle),
    end = polar(x, y, radius, startAngle),
    gt180 = endAngle - startAngle <= Math.PI ? '0' : '1'
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${gt180} 0 ${end.x} ${end.y}`
}

export interface KnobProps {
  value: number
  center: number
  onChange: (newValue: number) => any
  throttle?: number
}

const svgStyle = { width: '100%', height: '100%' }

export default function Knob(props: KnobProps) {
  const { value, onChange } = props,
    [dragging, setDragging] = useState(false),
    [startPos, setStartPos] = useState([0, 0]),
    [startValue, setStartValue] = useState(0),
    [tempValue, setTempValue] = useState(0),
    lastTempValue = useRef<number>(null),
    displayValue = dragging ? tempValue : value,
    style = useContext(CtyledContext),
    radius = 45,
    vangle = value2angle(displayValue),
    throttledOnChange = useCallback(
      _.throttle(onChange, props.throttle || 100, { leading: false }),
      [props.onChange]
    )

  useEffect(() => {
    const handleDrag = e => {
        e.preventDefault()
        const dx = e.clientX - startPos[0],
          dy = e.clientY - startPos[1],
          dist = Math.sqrt(dx * dx + dy * dy),
          positive = Math.abs(dx) > Math.abs(dy) ? dx > 0 : dy < 0,
          value = startValue + (dist / 100) * (positive ? 1 : -1),
          clippedValue = Math.max(Math.min(value, 1), 0)

        if (dist > 2) {
          lastTempValue.current = clippedValue
          setTempValue(clippedValue)
          throttledOnChange(clippedValue)
        }
      },
      handleMouseUp = () => {
        if (lastTempValue.current !== null) props.onChange(lastTempValue.current)
        window.removeEventListener('mousemove', handleDrag)
        window.removeEventListener('mouseup', handleMouseUp)
        setDragging(false)
        lastTempValue.current === null
      }
    if (dragging) {
      window.addEventListener('mousemove', handleDrag)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging])

  const handleMouseDown = useCallback(
    e => {
      e.stopPropagation()
      setDragging(true)
      setStartValue(value)
      setTempValue(value)
      setStartPos([e.clientX, e.clientY])
    },
    [value]
  )

  return (
    <KnobWrapper onMouseDown={handleMouseDown}>
      <svg style={svgStyle} viewBox="0 -5 100 100">
        <path
          fill={style.theme.color.bg}
          stroke={style.theme.color.nudge(0.2).bg}
          strokeWidth="8"
          d={getD(0, 1, radius)}
          strokeLinecap="round"
        />
        <line
          fill="none"
          stroke={style.theme.color.nudge(0.4).bg}
          strokeWidth="5"
          strokeLinecap="round"
          x1="50"
          y1="50"
          x2={50 + Math.cos(vangle) * (radius - 5)}
          y2={50 + Math.sin(vangle) * (radius - 5)}
        />
        <path
          fill="none"
          stroke={style.theme.color.nudge(0.4).bq}
          strokeWidth="8"
          d={getD(
            Math.min(props.center, displayValue),
            Math.max(props.center, displayValue),
            radius
          )}
          strokeLinecap="round"
        />
      </svg>
    </KnobWrapper>
  )
}
