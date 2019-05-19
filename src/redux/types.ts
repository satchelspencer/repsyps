export interface PlaybackState {
  on: boolean
  start: number //sample count
  length?: number //sample count
  vol: number,
  alpha?: number,
  aperiodic?: boolean
}

export interface TrackState {
  name: string
  buffer: AudioBuffer
  playback: PlaybackState,
  nextPlayback: Partial<PlaybackState>[],
  position: number,
  bounds: number[],
  selected: boolean,
  editing: boolean,
  alpha?: number
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