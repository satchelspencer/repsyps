export interface PlaybackState {
  playing: boolean
  start: number //sample count
  length: number //sample count
  alpha: number // ratio of out.len/in.len i.e "2" = half speed
  position: number //fraction of curent playback though input
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
  nextPlayback?: PlaybackState
}

export interface TracksState {
  [trackId: string]: TrackState
}

export interface AppState {
  tracks: TracksState
}