import { FFT } from 'dsp.js'
import { RATE } from 'render/util/audio'

const BIN_SIZE = 256, //size of each frame to measure
  SCAN_RANGE = 10 //number of adjacent frames to find maxes in

const cache: { [trackId: string]: Float32Array } = {}

/* find the beats in an audio buffer */
export default function(buffer: Float32Array, trackId?: string) {
  if (trackId && cache[trackId]) return cache[trackId]

  const fft = new FFT(BIN_SIZE, RATE),
    binCount = Math.floor(buffer.length / BIN_SIZE),
    bins = new Float32Array(binCount)

  let lastMean = 0
  for (let binIndex = 0; binIndex < binCount; binIndex++) {
    const startSample = binIndex * BIN_SIZE,
      window = buffer.subarray(startSample, startSample + BIN_SIZE)

    if (window.length !== BIN_SIZE) continue //if we ran into an edge, just dont bother

    /* compute the rate of change for the average magnintude of each freq */
    fft.forward(window)
    let sum = 0
    for (let x = 0; x < BIN_SIZE; x++) {
      sum += Math.sqrt(fft.real[x] * fft.real[x] + fft.imag[x] * fft.imag[x])
    }
    const mean = sum / BIN_SIZE,
      dmean = Math.max(mean - lastMean, 0)
    lastMean = mean
    bins[binIndex] = dmean / 3
  }

  // only local maxes, within SCAN_RANGE
  for (let i = 0; i < binCount; i++) {
    const value = bins[i]
    let isMax = true,
      d = -SCAN_RANGE
    for (; d < SCAN_RANGE; d++) {
      if (bins[i + d] && bins[i + d] > value) {
        isMax = false
        break
      }
    }
    if (!isMax || value < 0.1) bins[i] = 0 //if not a max, then remove
  }

  cache[trackId] = bins
  return bins
}

export { BIN_SIZE }
