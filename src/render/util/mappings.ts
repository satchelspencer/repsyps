import BezierEasing from 'bezier-easing'

import { RATE, EPSILON } from 'render/util/audio'

function ease(x1, y1, x2, y2) {
  return {
    apply: BezierEasing(x1, y1, x2, y2),
    reverse: BezierEasing(y1, x1, y2, x2),
  }
}

const filterEase = ease(0.49, 0.01, 1, 0.56)

export interface Mapping {
  toStandard(number): number
  fromStandard(number): number
}

export interface NamedMappings {
  [mappingName: string]: Mapping
}

const global: NamedMappings = {
  period: {
    toStandard(input) {
      return 1 - Math.sqrt((Math.floor(input) - EPSILON) / 9 / RATE)
    },
    fromStandard(input) {
      return Math.pow(1 - input, 2) * 9 * RATE + EPSILON
    },
  },
  volume: {
    toStandard(input) {
      if (input > 1) input = Math.pow(input, 1 / 4)
      input *= 0.666
      return input
    },
    fromStandard(input) {
      input /= 0.666
      if (input > 1) input = Math.pow(input, 4)
      return input
    },
  },
  filter: {
    toStandard(input) {
      if (input < 0.5) return Math.pow(2 * input, 1 / 6) / 2
      else return (Math.pow(2 * input - 1, 1 / 8) + 1) / 2
    },
    fromStandard(input) {
      if (input < 0.5) return Math.pow(2 * input, 6) / 2
      else return (Math.pow(2 * input - 1, 8) + 1) / 2
    },
  },
  delayGain: {
    toStandard(input) {
      return input * 3
    },
    fromStandard(input) {
      return input / 3
    },
  },
  delay: {
    toStandard(input) {
      return (input - 200) / 44100
    },
    fromStandard(input) {
      return input * 44100 + 200
    },
  },
}

export default global
