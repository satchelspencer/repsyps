import { FFT } from './dsp'

export const binSize = 256

export default function(buffer) {
  const fft = new FFT(binSize, 44100)
  const binCount = Math.floor(buffer.length / binSize)
  let bins = new Float64Array(binCount),
    lastVari = 0

  let lastMax = 0

  let lastMean = 0

  for (let bi = 0; bi < binCount; bi++) {
    const i = bi * binSize
    let window = buffer.subarray(i, i + binSize)
    if (window.length !== binSize) continue
    fft.forward(window)
    const mag = new Float64Array(binSize)
    let sum = 0
    for (let x = 0; x < binSize; x++) {
      const m = Math.sqrt(fft.real[x] * fft.real[x] + fft.imag[x] * fft.imag[x])
      mag[x] = m
      sum += m
    }
    const mean = sum / binSize
    let diff = 0
    for (let x = 0; x < binSize; x++) {
      diff += Math.abs(mean - mag[x])
    }
    const vari = diff / binSize
    const dvari = vari - lastVari
    lastVari = vari


    const dmean = Math.max(mean-lastMean, 0)
    lastMean = mean

    bins[bi] = dmean/3

    // let max = 0
    // for(let j=0;j<binSize;j++){
    //   const sample = buffer[j+i]
    //   if(sample > max){
    //     max = sample
    //   }
    // }
    // const dmax = max-lastMax
    // lastMax = max

    //bins[bi] = dmax

    //bins[bi] = Math.max(dvari / 2, 0)

    
  }
  
  // only use maxes
  for (let i = 0; i < binCount; i++) {
    const value = bins[i]
    const scanRange = 10
    let isMax = true, d = -scanRange
    for (; d < scanRange; d++) {
      if (bins[i + d] && bins[i + d] > value){
        isMax = false
        break
      }
    }
    if (!isMax) bins[i] = 0//bins[i]/(scanRange-Math.abs(d) )
  }

  return bins
}
