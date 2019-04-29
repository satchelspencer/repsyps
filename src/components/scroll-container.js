import React, { useRef, useEffect, useState, useCallback } from 'react'
import { unstable_batchedUpdates } from 'react-dom'
import ctyled from 'ctyled'
import { red } from 'ansi-colors'

const ScrollWrapper = ctyled.div.styles({
  column: true,
}).extend`
  position:absolute;
  width:100%;
  height:100%;
  overflow:scroll;
`

export default function ScrollContainer({ children }) {
  const ref = useRef(),
    [width, setWidth] = useState(0),
    [offset, setOffset] = useState(0),
    [scale, setScale] = useState(300),
    [zooming, setZooming] = useState(null),
    currentScale = useRef(scale),
    currentCenter = useRef(null),
    prevScale = useRef(null)

  const wheelStop = useCallback(
    _.debounce(() => {
      const targetOffset =
        currentCenter.current / Math.floor(currentScale.current) -
        ref.current.offsetWidth / 2
      setOffset(targetOffset)
      ref.current.scrollLeft = targetOffset
      setZooming(false)
      currentCenter.current = null
    }, 500),
    []
  )

  const handleZoom = useCallback(
    _.throttle(e => {
      const dy = e.deltaY > 0?Math.min(e.deltaY, 5):Math.max(e.deltaY, -5)
      const scaleFactor = currentScale.current / 10,
        next = Math.max(currentScale.current + dy * scaleFactor, 5)

      if (currentCenter.current === null) {
        prevScale.current = currentScale.current
        currentCenter.current =
          (ref.current.scrollLeft + ref.current.offsetWidth / 2) * currentScale.current
      }

      //console.log('sl', ref.current.scrollLeft)
      currentScale.current = next
      setScale(next)
      setZooming(true)
    }, 250),
    []
  )

  useEffect(() => {
    setOffset(ref.current.scrollLeft)
    setWidth(ref.current.offsetWidth)
    ref.current.addEventListener(
      'wheel',
      e => {
        if (e.ctrlKey) {
          e.preventDefault()
          handleZoom(e)
          wheelStop()
        }
      },
      { passive: false }
    )
  }, [ref.current])

  const zoomState = currentCenter.current && {
    center: currentCenter.current,
    initScale: prevScale.current,
    width: ref.current.offsetWidth,
  }

  return (
    <ScrollWrapper
      onScroll={e => {
        setOffset(ref.current.scrollLeft)
      }}
      inRef={ref}
    >
      {children(width, offset, scale, zoomState)}
    </ScrollWrapper>
  )
}
