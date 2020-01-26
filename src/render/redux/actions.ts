import { createActionCreator } from 'deox'

import * as Types from 'lib/types'
import { create } from 'redux-react-hook'

function createAction<Payload>(name) {
  return createActionCreator(name, res => (payload: Payload) => res(payload))
}

export const updateTime = createAction<Types.TimingState>('UPDATE_TIMES')

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

export const copySourceBounds = createAction<{
  src: string,
  dest: string
}>('COPY_SOURCE_BOUNDS')

export const updatePlayback = createAction<Partial<Types.Playback>>('UPDATE_PLAYBACK')

export const selectSourceExclusive = createAction<string>('SELECT_SOURCE_EX')

export const toggleSource = createAction<string>('TOGGLE_SOURCE_PLAYBACK')

export const editSource = createAction<{ sourceId: string; edit: boolean }>('SET_SOURCE_EDIT')