import { RATE, EPSILON } from 'render/util/audio'

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
      return input
    },
    fromStandard(input) {
      return input
    },
  },
}

export default global
