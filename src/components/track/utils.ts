import _ from 'lodash'

import { BIN_SIZE } from '../../dsp/impulse-detect'
import * as Types from '../../redux/types'
import { BoundViewContext, ViewContext } from './track'

export function getBoundIndex(x: number, view: BoundViewContext) {
  const sample = getTimeFromPosition(x, false, view)
  return _.findIndex(view.bounds, b => {
    return Math.abs(b - sample) < 7 * view.scale
  })
}

export function getNextBoundIndex(x: number, view: BoundViewContext) {
  const sample = getTimeFromPosition(x, false, view)
  return _.findIndex(view.bounds, b => {
    return b >= sample
  })
}

export function getTimeFromPosition(x: number, snap: boolean, view: ViewContext) {
  let raw = x * 2 * view.scale + view.start
  return snap ? snapSampleToImpulses(raw, view.scale, view.impulses) : raw
}

export function snapSampleToImpulses(raw: number, scale: number, impulses: Float32Array) {
  const impulseIndex = Math.floor(raw / BIN_SIZE),
    range = 5,
    sampleRange = scale * 20

  for (let i = 0; i < range; i = -1 * (i + (i > 0 ? 0 : -1))) {
    const impulse = impulses[impulseIndex + i],
      impulseTime = (impulseIndex + i) * BIN_SIZE
    if (impulse) {
      if (Math.abs(impulseTime - raw) < sampleRange) raw = impulseTime
      break
    }
  }
  return raw
}

export function inferTimeBase(
  playback: Types.PlaybackState,
  impulses: Float32Array
): number[] {
  const len = impulses.length * BIN_SIZE
  const bounds = []
  for (
    let sample = playback.start;
    sample < len;
    sample = snapSampleToImpulses(sample + playback.length, 400, impulses)
  ) {
    bounds.push(sample)
  }
  for (
    let sample = snapSampleToImpulses(playback.start - playback.length, 400, impulses);
    sample > 0;
    sample = snapSampleToImpulses(sample - playback.length, 400, impulses)
  ) {
    bounds.unshift(sample)
  }
  return bounds
}

export function getContainerPosition(container) {
  const { x: left, y: top } = container.current
      ? container.current.getBoundingClientRect()
      : { x: 0, y: 0 },
    width = container.current ? container.current.offsetWidth : 0,
    height = container.current ? container.current.offsetHeight : 0
  return { left, top, width, height }
}

export function getRelativePos(e, left: number, top: number) {
  return { x: e.clientX - left, y: e.clientY - top }
}
