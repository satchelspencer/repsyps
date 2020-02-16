export interface Playback {
  volume: number
  time: number //floor(time) is phase
  playing: boolean
  period: number
}

export interface TrackTiming {
  chunkIndex: number
  sample: number
  chunks: Chunks
  nextChunks: Chunks
  playing: boolean
}

export interface TimingState {
  time: number
  tracks: { [trackId: string]: TrackTiming }
}

export type Chunks = number[] //[start0,end0,start1,end1]

export interface TrackPlayback extends TrackTiming {
  alpha: number
  aperiodic: boolean
  nextAtChunk: boolean
}

export interface TrackChannel {
  name: string
  volume: number
}

export interface TrackChannels {
  [trackChannelId: string]: TrackChannel
}

export interface MixTrack extends TrackPlayback, TrackChannel {
  sourceId?: string
}

export type Channels = Float32Array[] //array of arrays... 1 per channel

export type Bounds = number[]

export type CueStartBehavior = 'immediate' | 'on-chunk' | 'on-end'

export type CueEndBehavior = 'loop' | 'next'

export interface Cue {
  chunks: Chunks
  startBehavior: CueStartBehavior
  endBehavior: CueEndBehavior
}

export interface Track {
  name: string
  playback: TrackPlayback
  trackChannels: TrackChannels
  bounds: Bounds
  selected: boolean
  editing: boolean
  cues: Cue[]
  cueIndex: number
  nextCueIndex: number
}

export interface Tracks {
  [trackId: string]: Track
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
  trackId: string
  cueIndex: number
}

export interface CueStepControl extends BaseControl {
  type: 'note'
  trackId: string
  cueStep: number
}

export type TrackValueProp = 'volume' | string //only vol for now

export interface TrackValueControl extends BaseControl {
  type: 'value'
  trackId: string
  trackChannelId?: string
  prop: TrackValueProp
}

export type GlobalValueProp = 'rate' | 'volume' | string

export interface GlobalValueControl extends BaseControl {
  type: 'value'
  global: true
  prop: GlobalValueProp
}

export type ValueControl = TrackValueControl | GlobalValueControl

export type NoteControl = CueControl | CueStepControl

export type Control = CueControl | CueStepControl | TrackValueControl | GlobalValueControl

export interface Controls {
  [controlId: string]: Control
}

export interface ControlValues {
  [controlId: string]: number
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
  tracks: Tracks
  controls: Controls
  bindings: Bindings
}
