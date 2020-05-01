import path from 'path'
import _ from 'lodash'

import * as Types from './types'
import { isDev } from 'render/util/env'

interface AudioAPI {
  init(root: string): void
  getOutputs(): Types.Output[]
  getDefaultOutput(): number
  start(deviceIndex: number): void
  stop(): void
  startPreview(deviceIndex: number): void
  stopPreview()
  updatePlayback(playback: Partial<Types.Playback>): void
  updateTime(time: number, relative: boolean): void
  removeSource(sourceId: string): boolean
  setMixTrack(trackId: string, track: Types.NativeTrackChange)
  removeMixTrack(trackId: string)
  getTiming(): Types.TimingState
  separateSource(sourceId: string)
  getWaveform(sourceId: string, start: number, scale: number, dest: Float32Array)
  getImpulses(sourceId: string): number[]
  loadSource(path: string, sourceId: string): Promise<string[]>
  exportSource(path: string, sourceId: string): boolean
  startRecording(fromSourceId: string)
  stopRecording(destSourceId: string): number[]
  syncToTrack(trackId: string, start: number, end: number)
}

export default (eval('require')(
  path.resolve(
    __dirname,
    isDev ? '../../../build/Release/audio.node' : 'build/Release/audio.node'
  )
) as unknown) as AudioAPI

export const RATE = 44100

export const EPSILON = RATE
