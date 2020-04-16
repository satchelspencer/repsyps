import React, { useRef, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

export interface ResizableBorderProps {
  vertical: boolean
  start: boolean
  onMove: (delta: number) => void
  onCommit: (delta: number) => void
}

const RBorderWrapper = ctyled.div.attrs({ vertical: false, start: false }).styles({})
  .extend`
  position:absolute;
  z-index:1;
  ${({ size }, { vertical, start }) => `
    ${vertical ? 'height' : 'width'}:${size / 2}px;
    ${vertical ? (start ? 'top' : 'bottom') : start ? 'left' : 'right'}:${
    (-1 * size) / 4
  }px;
    cursor:${vertical ? 'row-resize' : 'col-resize'};
    ${vertical ? `left:0;right:0;` : `top:0;bottom:0;`}
  `}
`

export default function ResizableBorder(props: ResizableBorderProps) {
  const start = useRef(0),
    handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        document.body.style.userSelect = 'none'
        start.current = props.vertical ? e.clientY : e.clientX
        const handleMouseMove = (e: MouseEvent) => {
            props.onMove((props.vertical ? e.clientY : e.clientX) - start.current)
          },
          handleMouseUp = (e: MouseEvent) => {
            document.body.style.userSelect = 'initial'
            props.onCommit((props.vertical ? e.clientY : e.clientX) - start.current)
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
          }
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
      },
      [props.onMove, props.start, props.vertical]
    )
  return (
    <RBorderWrapper
      onMouseDown={handleMouseDown}
      vertical={props.vertical}
      start={props.start}
    />
  )
}
