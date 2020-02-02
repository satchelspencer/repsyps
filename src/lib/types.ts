export interface Playback {
  volume: number
  time: number //floor(time) is phase
  playing: boolean
  period: number
}

export interface TrackTiming {
  chunkIndex: number
  sample: number
}

export interface TimingState {
  [trackId: string]: TrackTiming
}

export type Chunks = number[] //[start0,end0,start1,end1]

export interface TrackPlayback extends TrackTiming {
  chunks: Chunks
  alpha: number
  playing: boolean
  aperiodic: boolean
}

export interface TrackSource {
  name: string
  volume: number
}

export interface TrackSources {
  [trackSourceId: string]: TrackSource
}

export interface NativeTrack extends TrackPlayback, TrackSource {
  sourceId?: string
}

export type Channels = Float32Array[] //array of arrays... 1 per channel

export type Bounds = number[]

export interface Source {
  name: string
  playback: TrackPlayback
  trackSources: TrackSources
  bounds: Bounds
  selected: boolean
  editing: boolean
}

export interface Sources {
  [sourceId: string]: Source
}

export interface SourceControl {
  sourceId: string
  name: string
}

export interface CueControl extends SourceControl {
  chunks: Chunks
}

export type ValueProp = 'volume'

export interface ValueControl extends SourceControl {
  prop: ValueProp
  trackSourceId?: string
}

export interface Controls {
  values: ValueControl[]
  cues: CueControl[]
}

export type Binding = {
  channel: number,
  note: number,
  waiting?: boolean
}

export interface Bindings{
  values: Binding[]
  cues: Binding[] //midi note ids
}

export interface State {
  playback: Playback
  sources: Sources
  controls: Controls
  bindings: Bindings
}
