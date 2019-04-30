import * as Types from './types'

import { createActionCreator } from 'deox'

function createAction<Payload>(name) {
  return createActionCreator(name, res => (payload: Payload) => res(payload))
}

export const addTrack = createAction<{
  id: string
  buffer: AudioBuffer
  name: string
}>('ADD_TRACK')

export const rmTrack = createAction<{ id: string }>('REMOVE_TRACK')

export const updateTrackDisplay = createAction<{
  id: string
  display: Partial<Types.DisplayState>
}>('UPDATE_TRACK_DISPLAY')

export const updateTrackPlayback = createAction<{
  id: string
  playback: Partial<Types.PlaybackState>
  immediate: boolean
}>('UPDATE_TRACK_DISPLAY')
