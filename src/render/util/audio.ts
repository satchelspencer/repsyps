import path from 'path'
import _ from 'lodash'

import * as Types from './types'
import { isDev } from 'render/util/env'

interface AudioAPI {
  init(root: string): void
  start(): void
  stop(): void
  updatePlayback(playback: Partial<Types.Playback>): void
  addSource(sourceId: string, source: Types.Channels): void
  removeSource(sourceId: string): boolean
  setMixTrack(trackId: string, track: Types.NativeTrackChange)
  removeMixTrack(trackId: string)
  getTiming(): Types.TimingState
  separateSource(source: Types.Channels): Types.Channels
  getDebug(): any
}

export default (_.mapValues(
  eval('require')(
    path.resolve(
      __dirname,
      isDev ? '../../../build/Release/audio.node' : 'build/Release/audio.node'
    )
  ),
  (v, key) => {
    return v
  }
) as unknown) as AudioAPI

export const RATE = 44100

export const EPSILON = RATE
