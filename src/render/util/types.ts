export interface Playback {
  volume: number
  playing: boolean
  period: number
}

export interface TrackSourceParams {
  volume: number
  offset: number
}

export interface TrackSourcesParams {
  [sourceTrackId: string]: TrackSourceParams
}

export interface TrackSource {
  name: string
  source: string
  loaded: boolean
  streamIndex: number
}

export interface Source {
  name: string
  bounds: Bounds
  sourceTracks: { [sourceTrackId: string]: TrackSource }
}

export interface Sources {
  [sourceId: string]: Source
}

export type Chunks = number[] //[start0,end0,start1,end1]

export interface TrackPlayback {
  alpha: number
  aperiodic: boolean
  loop: boolean
  nextAtChunk: boolean
  volume: number
  muted: boolean
  filter: number
  sourceTracksParams: TrackSourcesParams
  /* timing info */
  chunkIndex: number
  chunks: Chunks
  playing: boolean
}

export interface TrackTiming extends NativeTrackChange {
  sample: number
}

export interface TimingState {
  time: number
  tracks: { [trackId: string]: TrackTiming }
}

export interface Times {
  time: number
  tracks: { [trackId: string]: number }
}

export type Channels = Float32Array[] //array of arrays... 1 per channel

export type Bounds = number[]

export type CueStartBehavior = 'immediate' | 'on-chunk' | 'on-end'

export type CueEndBehavior = 'loop' | 'next' | 'stop'

export interface Cue {
  playback: TrackPlayback
  used: (keyof TrackPlayback)[]
  startBehavior: CueStartBehavior
  endBehavior: CueEndBehavior
}

export interface NativeTrack {
  playback: TrackPlayback
  nextPlayback: TrackPlayback
}

export interface NativeTrackChange {
  playback: Partial<TrackPlayback>
  nextPlayback: Partial<TrackPlayback>
}

export interface Track extends NativeTrack {
  selected: boolean
  editing: boolean
  cues: Cue[]
  cueIndex: number
  nextCueIndex: number
  sourceTrackEditing: string | null
  visibleSourceTrack: string
}

export interface Tracks {
  [trackId: string]: Track
}

export interface Position {
  x: number
  y: number
}

export type SourceTrackValueProp = 'volume' | string

export type TrackValueProp = 'filter' | string

export type GlobalValueProp = 'rate' | 'volume' | string

export interface ControlMapping {
  invert: boolean
}

export interface CueControl extends ControlMapping {
  trackIndex: number
  cueIndex: number
}

export interface CueStepControl extends ControlMapping {
  trackIndex: number
  cueStep: number
}

export interface SourceTrackValueControl extends ControlMapping {
  trackIndex: number
  sourceTrackIndex: number
  sourceTrackProp: SourceTrackValueProp
}

export interface TrackValueControl extends ControlMapping {
  trackIndex: number
  trackProp: TrackValueProp
}

export interface GlobalValueControl extends ControlMapping {
  globalProp: GlobalValueProp
}

export type Control =
  | CueControl
  | CueStepControl
  | SourceTrackValueControl
  | TrackValueControl
  | GlobalValueControl

export interface ControlGroup {
  name?: string
  absolute: boolean
  position: Position
  bindingType: BindingType
  controls: Control[]
}

export interface Grid<T> {
  [coord: string]: T
}

export type MidiFunctionName =
  | 'note'
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
  twoway: boolean
}

export type Controls = Grid<ControlGroup>

export interface Scene {
  controls: Controls
  trackIds: string[]
}

export type ControlValues = Grid<number>

export type Bindings = Grid<Binding>

export interface ControlPreset {
  name: string
  controls: Controls
}

export interface ControlPresets {
  [presetId: string]: ControlPreset
}

export interface Live {
  sceneIndex: number
  scenes: Scene[]
  controlValues: ControlValues
  initValues: ControlValues
  tracks: Tracks
  bindings: Bindings
  controlPresets: ControlPresets
  defaultPresetId: string
  controlsEnabled: boolean
}

export interface BindingsFile {
  bindings: Bindings
  controlPresets: ControlPresets
  defaultPresetId: string
}

export interface State {
  playback: Playback
  live: Live
  sources: Sources
  timing: Times
}
