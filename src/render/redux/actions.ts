import { createActionCreator } from 'deox'

import * as Types from 'lib/types'
import { create } from 'redux-react-hook'

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

export const addValueControl = createAction<{
  control: Types.ValueControl
  index?: number
}>('ADD_VALUE_CONTROL')

export const deleteValueControl = createAction<number>('DELETE_VALUE_CONTROL') //by index

export const addCueControl = createAction<{
  control: Types.CueControl
  index?: number
}>('ADD_CUE_CONTROL')

export const deleteCueControl = createAction<number>('DELETE_CUE_CONTROL') //by index

export const setValueBinding = createAction<{ index: number; binding: Types.Binding }>(
  'SET_VALUE_BINDING'
)

export const setCueBinding = createAction<{ index: number; binding: Types.Binding }>(
  'SET_CUE_BINDING'
)

export function updateValueControlValue(control: Types.ValueControl, value: number) {
  if (control.prop === 'volume' && control.trackSourceId)
    return setSourceTrack({
      sourceId: control.sourceId,
      trackSourceId: control.trackSourceId,
      trackSource: {
        volume: value,
      },
    })
  else return { type: 'NOOP' }
}

export function playbackCueControl(control: Types.CueControl) {
  return setSourcePlayback({
    sourceId: control.sourceId,
    playback: {
      chunks: control.chunks,
      chunkIndex: -1,
      playing: true
    },
  })
}
