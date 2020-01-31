/* returns the min and max for various size bins of the audio
  used for visualizing the waveform */

export type MinMaxes = [Float32Array, Float32Array, number][]

const cache: { [key: string]: MinMaxes } = {}

export default function getMinMaxes(buffer: Float32Array, key?: string): MinMaxes {
  if (key && cache[key]) return cache[key]
  let minMaxes = []
  for (let frameSize = 2; frameSize < Math.floor(buffer.length / 2); frameSize *= 2) {
    const frameCount = Math.ceil(buffer.length / frameSize),
      mins = new Float32Array(frameCount),
      maxes = new Float32Array(frameCount),
      lastMinMax = minMaxes[minMaxes.length - 1],
      prevMins = lastMinMax ? lastMinMax[0] : buffer,
      prevMaxes = lastMinMax ? lastMinMax[1] : buffer

    for (let fi = 0; fi < frameCount; fi++) {
      const start = fi * 2,
        end = (fi + 1) * 2
      let min = 0,
        max = 0

      for (let i = start; i < end; i++) {
        if (prevMaxes[i] > 0 && prevMaxes[i] > max) max = prevMaxes[i]
        if (prevMins[i] < 0 && prevMins[i] < min) min = prevMins[i]
      }
      mins[fi] = min
      maxes[fi] = max
    }
    minMaxes.push([mins, maxes, frameSize])
  }
  if (key) cache[key] = minMaxes
  return minMaxes
}
