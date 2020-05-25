import _ from 'lodash'

import { ViewContext } from './track'
import snapSampleToImpulses from 'render/util/snap-sample'
import { canvasScale } from 'render/util/env'

export function getRelativePos(e, left: number, top: number) {
  return { x: e.clientX - left, y: e.clientY - top }
}

export function getTimeFromPosition(x: number, snap: boolean, view: ViewContext) {
  let raw = x * canvasScale * view.scale + view.start
  return snapSampleToImpulses(raw, view.scale, view.impulses, snap)
}

export function getPositionFromTime(sample: number, scale, start){
  return (sample-start) / canvasScale / scale
}

export function getBoundIndex(x: number, view: ViewContext, bounds: number[]) {
  const sample = getTimeFromPosition(x, false, view)
  return _.findIndex(bounds, (b) => {
    return Math.abs(b - sample) < 9 * view.scale
  })
}

export function getNextBoundIndex(x: number, view: ViewContext, bounds: number[]) {
  const sample = getTimeFromPosition(x, false, view)
  return _.findIndex(bounds, (b) => {
    return b >= sample
  })
}

export function capture(callbacks: (() => any)[]) {
  for (let i = 0; i < callbacks.length; i++) {
    if (callbacks[i]()) break
  }
}
