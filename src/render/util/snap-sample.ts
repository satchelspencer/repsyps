import { findNearest } from './impulse-detect'

export default function snapSampleToImpulses(
  raw: number,
  scale: number,
  impulses: number[]
) {
  const impulseIndex = findNearest(impulses, raw), //Math.floor(raw / BIN_SIZE),
    impulseTime = impulses[impulseIndex],
    sampleRange = scale * 20,
    diff = Math.abs(impulseTime - raw)
  return Math.round(diff < sampleRange ? impulseTime : raw)
}
