import React, { useState, useCallback, useEffect, useRef, useMemo, memo } from 'react'
import ResizeObserver from 'resize-observer-polyfill'
import * as _ from 'lodash'

import ctyled from 'ctyled'

const SliderWrapper = ctyled.div
  .attrs<{ column?: boolean }>({ column: false })
  .styles({
    align: 'center',
    column: (_, { column }) => column,
    height: (_, { column }) => (column ? '100%' : 1.5),
    width: (_, { column }) => (column ? 1.5 : '100%'),
    //color: c => c.contrast(-0.15),
  }).extendSheet`
    -webkit-app-region: no-drag;
    cursor:pointer;
  `

const SliderGuide = ctyled.div
  .attrs<{ column?: boolean }>({ column: false })
  .styles({
    color: c => c.nudge(0.2),
    bg: true,
    border: true,
    rounded: true,
    flex: 1,
    height: (_, { column }) => (column ? 'auto' : 0.5),
    width: (_, { column }) => (column ? 0.5 : 'auto'),
  })

const HANDLE_MINOR = 0.5,
  HANDLE_MAJOR = 1.5

const Handle = ctyled.div
  .attrs<{ column?: boolean }>({ column: false })
  .styles({
    bg: true,
    rounded: true,
    border: true,
    flex: 1,
    color: c => c.invert().contrast(-0.2),
    height: (_, { column }) => (column ? HANDLE_MINOR : HANDLE_MAJOR),
    width: (_, { column }) => (column ? HANDLE_MAJOR : HANDLE_MINOR),
  }).extend`
  position:absolute;
  `

interface SliderProps {
  column?: boolean
  throttle?: number
  value: number
  onChange: (value: number) => any
}

function Slider(props: SliderProps) {
  const wrapper = useRef(null),
    handle = useRef(null),
    [size, setSize] = useState(0),
    [dragOffset, setDragOffset] = useState(null),
    throttledOnChange = useCallback(_.throttle(props.onChange, props.throttle || 100), [
      props.onChange,
    ])

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      const entry = entries[0]
      const { width, height } = entry.contentRect
      setSize(props.column ? height : width)
    })
    ro.observe(wrapper.current)
    return () => ro.disconnect()
  }, [])

  const handleOffset = handle.current
      ? Math.floor(handle.current[props.column ? 'offsetHeight' : 'offsetWidth'] / 2)
      : 1,
    min = handleOffset,
    max = size - handleOffset,
    range = max - min,
    docOffset = wrapper.current
      ? wrapper.current.getBoundingClientRect()[props.column ? 'top' : 'left']
      : 0,
    callbackDeps = [handleOffset, range, docOffset, props.column, props.onChange]

  const handleMouseDown = useCallback(e => {
      e.preventDefault()
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }, callbackDeps),
    handleMouseUp = useCallback(e => {
      e.preventDefault()
      setDragOffset(null)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }, callbackDeps),
    handleMouseMove = useCallback(e => {
      e.preventDefault()
      const offset =
          (props.column
            ? docOffset + size - e[props.column ? 'clientY' : 'clientX']
            : e[props.column ? 'clientY' : 'clientX'] - docOffset) - handleOffset,
        value = Math.max(Math.min(offset / range, 1), 0)
      throttledOnChange(value)
      setDragOffset(value)
    }, callbackDeps)

  const handleStyle = useMemo(() => {
    return {
      [props.column ? 'bottom' : 'left']:
        range * (dragOffset !== null ? dragOffset : props.value),
    }
  }, [props.column, range, props.value, dragOffset])

  return (
    <SliderWrapper
      column={props.column}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      inRef={wrapper}
    >
      <SliderGuide column={props.column} onClick={handleMouseMove} />
      <Handle
        onMouseDown={handleMouseDown}
        column={props.column}
        inRef={handle}
        style={handleStyle}
      />
    </SliderWrapper>
  )
}

export default memo(Slider)
