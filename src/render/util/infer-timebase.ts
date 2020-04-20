import snapSampleToImpulses from './snap-sample'
import * as Types from './types'

const SNAP_SCALE = 200

export default function inferTimeBase(
  chunks: Types.Chunks,
  impulses: number[],
  snap: boolean
): number[] {
  const len = impulses[impulses.length - 1], //last impulse
    bounds = [],
    cstart = chunks[0],
    clength = chunks[1]
  for (
    let sample = cstart;
    sample < len + clength;
    sample = snapSampleToImpulses(sample + clength, SNAP_SCALE, impulses, snap)
  ) {
    bounds.push(sample)
  }
  for (
    let sample = snapSampleToImpulses(cstart - clength, SNAP_SCALE, impulses, snap);
    sample > 0 - clength;
    sample = snapSampleToImpulses(sample - clength, SNAP_SCALE, impulses, snap)
  ) {
    bounds.unshift(sample)
  }
  return bounds
}
