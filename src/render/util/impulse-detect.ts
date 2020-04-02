import audio from 'render/util/audio'
import _ from 'lodash'

const cache: { [trackId: string]: number[] } = {}

export default function(trackId?: string) {
  if (trackId && cache[trackId]) return cache[trackId]
  const beats = audio.getImpulses(trackId).slice(1)
  cache[trackId] = beats
  return beats
}

export function findNearest(impulses: number[], sample: number) {
  if (impulses[0] > sample) return 0

  let min = 0,
    max = impulses.length
  while (max - min > 1) {
    const center = Math.floor(min + (max - min) / 2),
      value = impulses[center]
    if (value > sample) max = center
    else if (value < sample) min = center
    else return center
  }
  const mival = impulses[min],
    maval = impulses[max],
    adiff = sample - mival,
    bdiff = maval - sample

  return adiff > bdiff ? max : min
}
