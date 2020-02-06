import { useEffect, useState } from 'react'
import _ from 'lodash'

import { ViewContext } from './source'
import { BIN_SIZE } from 'render/util/impulse-detect'
import * as Types from 'render/util/types'
import snapSampleToImpulses from 'render/util/snap-sample'

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

export function getBoundIndex(x: number, view: ViewContext, bounds: number[]) {
  const sample = getTimeFromPosition(x, false, view)
  return _.findIndex(bounds, b => {
    return Math.abs(b - sample) < 7 * view.scale
  })
}

export function getNextBoundIndex(x: number, view: ViewContext, bounds: number[]) {
  const sample = getTimeFromPosition(x, false, view)
  return _.findIndex(bounds, b => {
    return b >= sample
  })
}

export function capture(callbacks: (() => any)[]) {
  for (let i = 0; i < callbacks.length; i++) {
    if (callbacks[i]()) break
  }
}
