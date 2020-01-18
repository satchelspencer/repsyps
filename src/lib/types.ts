export interface Playback {
  volume: number
  time: number //floor(time) is phase
  playing: boolean
  period: number
}

export interface TrackTiming{
  chunkIndex: number
  sample: number
}

export interface Track extends TrackTiming{
  sourceId?: string
  volume: number
  chunks: number[] //[start0,end0,start1,end1]
  alpha: number
  playing: boolean
  aperiodic: boolean
}

export type NativeChannels = Float32Array[] //array of arrays... 1 per channel
export type Channels = AudioBuffer

export interface Source {
  channels: Channels
  name: string
  playback: Track
  bounds: number[]
  selected: boolean
  editing: boolean
}

export interface Sources {
  [sourceId: string]: Source
}

export interface TimingState{
  [trackId: string]: TrackTiming
}

export interface State {
  playback: Playback
  sources: Sources
}