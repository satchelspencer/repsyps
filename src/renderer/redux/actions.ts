import { createActionCreator } from 'deox'

import * as Types from 'lib/types'

function createAction<Payload>(name) {
  return createActionCreator(name, res => (payload: Payload) => res(payload))
}

export const addSource = createAction<{
  sourceId: string
  channels: Types.Channels
  name: string
}>('ADD_SOURCE')

export const rmSource = createAction<string>('REMOVE_SOURCE')

export const setSourcePlayback = createAction<{
  sourceId: string
  playback: Partial<Types.Track>
}>('SET_SOURCE_PLAYBACK')

export const setSourceBounds = createAction<{
  sourceId: string
  bounds: number[]
}>('SET_SOURCE_BOUNDS')

export const updatePlayback = createAction<Partial<Types.Playback>>('UPDATE_PLAYBACK')
