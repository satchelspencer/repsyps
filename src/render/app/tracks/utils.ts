import _ from 'lodash'

import { ViewContext } from './track'
import snapSampleToImpulses from 'render/util/snap-sample'

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
    return Math.abs(b - sample) < 9 * view.scale
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
