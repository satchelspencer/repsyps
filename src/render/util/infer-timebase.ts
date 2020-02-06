import { BIN_SIZE } from './impulse-detect'
import snapSampleToImpulses from './snap-sample'
import * as Types from './types'

const SNAP_SCALE = 400

export default function inferTimeBase(
  chunks: Types.Chunks,
  impulses: Float32Array
): number[] {
  const len = impulses.length * BIN_SIZE,
    bounds = [],
    cstart = chunks[0],
    clength = chunks[1]
  for (
    let sample = cstart;
    sample < len;
    sample = snapSampleToImpulses(sample + clength, SNAP_SCALE, impulses)
  ) {
    bounds.push(sample)
  }
  for (
    let sample = snapSampleToImpulses(cstart - clength, SNAP_SCALE, impulses);
    sample > 0;
    sample = snapSampleToImpulses(sample - clength, SNAP_SCALE, impulses)
  ) {
    bounds.unshift(sample)
  }
  return bounds
}
