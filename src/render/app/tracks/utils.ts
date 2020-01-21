import { useEffect, useState } from 'react'

import { ViewContext } from './source'
import { BIN_SIZE } from 'lib/impulse-detect'
import * as Types from 'lib/types'
import snapSampleToImpulses from 'lib/snap-sample'

export function getContainerPosition(container) {
  const [pos, setPos] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })

  useEffect(() => {
    const { x: left, y: top } = container.current
        ? container.current.getBoundingClientRect()
        : { x: 0, y: 0 },
      width = container.current ? container.current.offsetWidth : 0,
      height = container.current ? container.current.offsetHeight : 0
    setPos({ left, top, width, height })
  }, [container.current && container.current.offsetWidth])

  return pos
}

export function getRelativePos(e, left: number, top: number) {
  return { x: e.clientX - left, y: e.clientY - top }
}

export function getTimeFromPosition(x: number, snap: boolean, view: ViewContext) {
  let raw = x * 2 * view.scale + view.start
  return snap ? snapSampleToImpulses(raw, view.scale, view.impulses) : raw
}