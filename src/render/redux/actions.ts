import { createActionCreator } from 'deox'

import * as Types from 'render/util/types'

function createAction<Payload>(name) {
  return createActionCreator(name, res => (payload: Payload) => res(payload))
}

export const updateTime = createAction<Types.TimingState>('UPDATE_TIMES')

export const addSource = createAction<{
  sourceId: string
  trackSources: Types.TrackSources
  name: string
  bounds?: Types.Bounds
}>('ADD_SOURCE')

export const rmSource = createAction<string>('REMOVE_SOURCE')

export const setSourceTrack = createAction<{
  sourceId: string
  trackSourceId: string
  trackSource: Partial<Types.TrackSource>
}>('SET_SOURCE_TRACK')

export const setSourcePlayback = createAction<{
  sourceId: string
  playback: Partial<Types.TrackPlayback>
}>('SET_SOURCE_PLAYBACK')

export const setSourceBounds = createAction<{
  sourceId: string
  bounds: number[]
}>('SET_SOURCE_BOUNDS')

export const copySourceBounds = createAction<{
  src: string
  dest: string
}>('COPY_SOURCE_BOUNDS')

export const updatePlayback = createAction<Partial<Types.Playback>>('UPDATE_PLAYBACK')

export const selectSourceExclusive = createAction<string>('SELECT_SOURCE_EX')

export const toggleSource = createAction<string>('TOGGLE_SOURCE_PLAYBACK')

export const editSource = createAction<{ sourceId: string; edit: boolean }>(
  'SET_SOURCE_EDIT'
)

export const addCue = createAction<{
  sourceId: string
  cue: Types.Cue
  index?: number
}>('ADD_CUE')

export const deleteCue = createAction<{
  sourceId: string
  index: number
}>('DELETE_CUE')

export const addControl = createAction<{
  controlId: string
  control: Types.Control
}>('ADD_CONTROL')

export const removeControl = createAction<string>('REMOVE_CONTROL')

export const addBinding = createAction<{
  bindingId: string
  binding: Types.Binding
}>('ADD_BINDING')

export const removeBinding = createAction<string>('REMOVE_BINDING')

export const applyControl = createAction<{
  control: Types.Control
  value: number
  function: Types.MidiFunctionName
}>('APPLY_CONTROL')
