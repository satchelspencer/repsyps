import React, { useRef, useEffect, useState } from 'react'
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
    [h, sh] = useState(0)
  useEffect(() => {
    setOffset(ref.current.scrollLeft)
    setWidth(ref.current.offsetWidth)
  }, [ref.current])
  return (
    <ScrollWrapper onMouseMove={e => sh(e.clientY)} onScroll={() => setOffset(ref.current.scrollLeft)} inRef={ref}>
      {children(width, offset)}
    </ScrollWrapper>
  )
}
