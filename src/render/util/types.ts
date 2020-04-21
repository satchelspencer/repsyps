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

export interface PersistentTrackSource {
  name: string
  source: string
  streamIndex: number
}

export interface TrackSource {
  name: string
  source: string
  streamIndex: number
  loaded: boolean
  missing: boolean
}

export interface TrackSources {
  [sourceTrackId: string]: TrackSource
}

export interface SourceInfo {
  sourceId: string
  sourceTrackId: string
  path: string
  missing: boolean
}

export interface PersistentSource {
  name: string
  bounds: Bounds
  boundsAlpha: number
  sourceTracks: { [sourceTrackId: string]: PersistentTrackSource }
}

export interface Source {
  name: string
  bounds: Bounds
  boundsAlpha: number
  sourceTracks: TrackSources
}

export interface PersistentSources {
  [sourceId: string]: PersistentSource
}

export interface Sources {
  [sourceId: string]: Source
}

export type Chunks = number[] //[start0,end0,start1,end1]

export interface PersitentTrackPlayback {
  alpha: number
  aperiodic: boolean
  loop: boolean
  nextAtChunk: boolean
  volume: number
  filter: number
  sourceTracksParams: TrackSourcesParams
}

export interface TrackPlayback extends PersitentTrackPlayback {
  muted: boolean
  unpause: boolean
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
  recTime: number
}

export interface Times {
  time: number
  tracks: { [trackId: string]: number }
  recTime: number
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

export interface CueBasis {
  playback: Partial<TrackPlayback>
  used?: (keyof TrackPlayback)[]
  startBehavior: CueStartBehavior
  endBehavior?: CueEndBehavior
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
  playLock: boolean
  lastPeriod: number
}

export interface PersistentTrack {
  visibleSourceTrack: string
  playback: PersitentTrackPlayback
  cues: Cue[]
  lastPeriod: number
}

export interface PersistentTracks {
  [trackId: string]: PersistentTrack
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

export interface LoopControl extends ControlMapping {
  trackIndex: number
  loop: number
}

export type SyncControlState = 'on' | 'off' | 'lock'

export interface SyncControl extends ControlMapping {
  trackIndex: number
  sync: SyncControlState
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

export interface SceneVolumeControl extends ControlMapping {
  relativeSceneIndex: number
}

export interface GlobalValueControl extends ControlMapping {
  globalProp: GlobalValueProp
}

export type Control =
  | CueControl
  | CueStepControl
  | LoopControl
  | SyncControl
  | SourceTrackValueControl
  | TrackValueControl
  | GlobalValueControl
  | SceneVolumeControl

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

export interface PersistentBinding {
  midi: number //first two bits of midi message
  twoway: boolean
}

export interface Binding extends PersistentBinding {
  waiting?: boolean
  twoway: boolean
  badMidiValue: boolean
  lastMidiValue: number
}

export type Controls = Grid<ControlGroup>

export interface Scene {
  controls: Controls
  controlValues: ControlValues
  initValues: ControlValues
  trackIds: string[]
}

export interface PersistentScene {
  controls: Controls
  trackIds: string[]
}

export type ControlValues = Grid<number>

export type Bindings = Grid<Binding>

export type PersistentBindings = Grid<PersistentBinding>

export interface ControlPreset {
  name: string
  controls: Controls
}

export interface ControlPresets {
  [presetId: string]: ControlPreset
}

export interface PersistentLive {
  scenes: PersistentScene[]
  bindings: PersistentBindings
  controlPresets: ControlPresets
  defaultPresetId: string
  tracks: PersistentTracks
}

export interface Live {
  sceneIndex: number
  scenes: Scene[]
  tracks: Tracks
  bindings: Bindings
  controlPresets: ControlPresets
  defaultPresetId: string
  controlsEnabled: boolean
  selectedPosition: Position
}

export interface BindingsFile {
  bindings: Bindings
  controlPresets: ControlPresets
  defaultPresetId: string
}

export interface SaveStatus {
  saved: boolean
  path: string
}

export type UpdateRate = 'high' | 'medium' | 'low'

export interface Settings {
  trackScroll: boolean
  darkMode: boolean
  size: number
  updateRate: UpdateRate
  controlsSize: number
  sidebarSize: number
  gridSize: number
  snap: boolean
}

export interface Recording {
  enabled: boolean
  fromTrack: string
}

export interface PersistentState {
  playback: Playback
  live: PersistentLive
  sources: PersistentSources
}

export interface LocalPersistentState {
  save: SaveStatus
  settings: Settings
  output: LocalPersistentOutputState
}

export interface Output {
  name: string
  index: number
  channels: number
}

export interface LocalPersistentOutputState {
  current: number
}

export interface OutputState {
  devices: Output[]
  default: number
  current: number
}

export interface MenuState {
  trackScroll: boolean
  darkMode: boolean
  size: number
  updateRate: UpdateRate
  sceneIndex: number
  scenesCount: number
  output: OutputState
  selectedTrackId: string
  editing: boolean
  trackPlaying: boolean
  playing: boolean
  snap: boolean
}

export interface State {
  playback: Playback
  live: Live
  sources: Sources
  timing: Times
  save: SaveStatus
  settings: Settings
  recording: Recording
  output: OutputState
  modalRoute: string
}
