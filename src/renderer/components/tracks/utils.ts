import { useEffect, useState } from 'react'

import { ViewContext } from './source'
import { BIN_SIZE } from 'renderer/dsp/impulse-detect'
import * as Types from 'lib/types'

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

export function inferTimeBase(playback: Types.Track, impulses: Float32Array): number[] {
  const len = impulses.length * BIN_SIZE,
    bounds = [],
    cstart = playback.chunks[0],
    clength = playback.chunks[1]
  for (
    let sample = cstart;
    sample < len;
    sample = snapSampleToImpulses(sample + clength, 400, impulses)
  ) {
    bounds.push(sample)
  }
  for (
    let sample = snapSampleToImpulses(cstart - clength, 400, impulses);
    sample > 0;
    sample = snapSampleToImpulses(sample - clength, 400, impulses)
  ) {
    bounds.unshift(sample)
  }
  return bounds
}
