import { combineReducers } from 'redux'
import { createReducer } from 'redux-create-reducer'

interface AudioChunk {
  start: number,
  length: number
}

interface PlaybackState {
  playing: boolean
}

interface TracksState {
  [trackId: string]: {
    name: string
    buffer: AudioBuffer
  }
}

interface DisplayState {
  scale: number
}

export interface AppState {
  playback: PlaybackState
  tracks: TracksState
}

export default function(state: AppState, action) {
  return state
}
