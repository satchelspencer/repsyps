export interface PlaybackState {
  on: boolean
  start: number //sample count
  length?: number //sample count
  vol: 1,
  alpha?: number,
  aperiodic?: boolean
}

export interface DisplayState {
  scale: number //samples per pixel
  start: number //sample #
}

export interface TrackState {
  name: string
  buffer: AudioBuffer
  display: DisplayState
  playback: PlaybackState,
  nextPlayback?: Partial<PlaybackState>,
  position: number
}

export interface MixState{
  frac: number
  length: number
  on: boolean
}

export interface TracksState {
  [trackId: string]: TrackState
}

export interface AppState {
  tracks: TracksState
  mix: MixState
}