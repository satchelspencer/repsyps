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

export interface MixTrack extends TrackPlayback, TrackSource {
  sourceId?: string
}

export type Channels = Float32Array[] //array of arrays... 1 per channel

export type Bounds = number[]

export type Cue = Partial<TrackPlayback>

export interface Source {
  name: string
  playback: TrackPlayback
  trackSources: TrackSources
  bounds: Bounds
  selected: boolean
  editing: boolean
  cues: Cue[]
}

export interface Sources {
  [sourceId: string]: Source
}

export interface ControlPosition {
  x: number
  y: number
}

export interface BaseControl {
  type: BindingType
  name: string
  position: ControlPosition
}

export interface CueControl extends BaseControl {
  type: 'note'
  sourceId: string
  cueIndex: number
}

export type TrackValueProp = 'volume' | string //only vol for now

export interface TrackValueControl extends BaseControl {
  type: 'value'
  sourceId: string
  trackSourceId?: string
  prop: TrackValueProp
}

export type GlobalValueProp = 'rate' | 'volume' | string

export interface GlobalValueControl extends BaseControl {
  type: 'value'
  global: true
  prop: GlobalValueProp
}

export type ValueControl = TrackValueControl | GlobalValueControl

export type Control = CueControl | TrackValueControl | GlobalValueControl

export interface Controls {
  [controlId: string]: Control
}

export type MidiFunctionName =
  | 'note-off'
  | 'note-on'
  | 'poly-aftertouch'
  | 'control'
  | 'program'
  | 'channel-aftertouch'
  | 'pitch-bend'

export type BindingType = 'note' | 'value'

export type Binding = {
  type: BindingType
  channel: number
  note: number
  function: MidiFunctionName
  waiting?: boolean
  position: ControlPosition
}

export interface Bindings {
  [bindingId: string]: Binding
}

export interface State {
  playback: Playback
  sources: Sources
  controls: Controls
  bindings: Bindings
}
