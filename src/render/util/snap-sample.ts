import { BIN_SIZE } from './impulse-detect'

export default function snapSampleToImpulses(raw: number, scale: number, impulses: Float32Array) {
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
