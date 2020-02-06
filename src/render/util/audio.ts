import path from 'path'

import * as Types from './types'
import { isDev } from 'render/util/env'

interface AudioAPI {
  init(root: string): void
  start(): void
  stop(): void
  updatePlayback(playback: Partial<Types.Playback>): void
  addSource(sourceId: string, source: Types.Channels): void
  removeSource(sourceId: string): boolean
  setMixTrack(trackId: string, track: Partial<Types.MixTrack>)
  removeMixTrack(trackId: string)
  getTiming(): Types.TimingState
  separateSource(source: Types.Channels): Types.Channels
  getDebug(): any
}

export default eval('require')(
  path.resolve(
    __dirname,
    isDev ? '../../../build/Release/audio.node' : 'build/Release/audio.node'
  )
) as AudioAPI

export const RATE = 44100

export const EPSILON = RATE
