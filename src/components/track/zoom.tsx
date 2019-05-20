import React, { useEffect, useState, useRef } from 'react'
import _ from 'lodash'

export default function useZoom(container: React.MutableRefObject<any>, center: number) {
  const [scale, setScale] = useState(200),
    [start, setStart] = useState(0),
    handleWheel = useRef(null)

  useEffect(() => {
    handleWheel.current = e => {
      const { deltaX, deltaY, ctrlKey } = e
      if (ctrlKey) {
        const scaleMultiplier = scale / 100,
          nextScale = Math.max(scale + deltaY * scaleMultiplier, 2),
          dx = (nextScale - scale) * center
        setStart(start - dx)
        setScale(nextScale)
      } else {
        setStart(start + deltaX * scale)
      }
    }
  }, [scale, start])

  useEffect(() => {
    container.current.addEventListener(
      'wheel',
      e => {
        e.preventDefault()
        handleWheel.current && handleWheel.current(e)
      },
      { passive: false } //so we can prevent default
    )
  }, [container.current])

  return { scale, start }
}
