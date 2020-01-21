import { BIN_SIZE } from 'lib/impulse-detect'
import snapSampleToImpulses from 'lib/snap-sample'
import * as Types from 'lib/types'

const SNAP_SCALE = 400

export default function inferTimeBase(
  playback: Types.Track,
  impulses: Float32Array
): number[] {
  const len = impulses.length * BIN_SIZE,
    bounds = [],
    cstart = playback.chunks[0],
    clength = playback.chunks[1]
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
