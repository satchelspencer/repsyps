import { createActionCreator } from 'deox'

import * as Types from 'render/util/types'

function createAction<Payload>(name) {
  return createActionCreator(name, res => (payload: Payload) => res(payload))
}

export const updateTime = createAction<{
  timing: Types.TimingState
  commit: boolean
}>('UPDATE_TIMES')

export const addTrack = createAction<{
  trackId: string
  trackChannels: Types.TrackChannels
  name: string
  bounds?: Types.Bounds
}>('ADD_TRACK')

export const rmTrack = createAction<string>('REMOVE_TRACK')

export const setTrackChannels = createAction<{
  trackId: string
  trackChannelId: string
  trackChannel: Partial<Types.TrackChannel>
}>('SET_TRACK_CHANNEL')

export const setTrackPlayback = createAction<{
  trackId: string
  playback: Partial<Types.TrackPlayback>
}>('SET_TRACK_PLAYBACK')

export const setTrackBounds = createAction<{
  trackId: string
  bounds: number[]
}>('SET_TRACK_BOUNDS')

export const copyTrackBounds = createAction<{
  src: string
  dest: string
}>('COPY_TRACK_BOUNDS')

export const updatePlayback = createAction<Partial<Types.Playback>>('UPDATE_PLAYBACK')

export const selectTrackExclusive = createAction<string>('SELECT_TRACK_EX')

export const toggleTrack = createAction<string>('TOGGLE_TRACK_PLAYBACK')

export const editTrack = createAction<{ trackId: string; edit: boolean }>(
  'SET_TRACK_EDIT'
)

export const setTrackMuted = createAction<{ trackId: string; muted: boolean }>(
  'SET_TRACK_MUTE'
)

export const setTrackSolo = createAction<{ trackId: string; solo: boolean }>(
  'SET_TRACK_SOLO'
)

export const addCue = createAction<{
  trackId: string
  cue: Types.Cue
  index?: number
}>('ADD_CUE')

export const deleteCue = createAction<{
  trackId: string
  index: number
}>('DELETE_CUE')

export const reorderCue = createAction<{
  trackId: string
  oldIndex: number
  newIndex: number
}>('REORDER_CUE')

export const addControl = createAction<{
  controlId: string
  control: Types.Control
}>('ADD_CONTROL')

export const setControlPos = createAction<{
  controlId: string
  position: Partial<Types.ControlPosition>
}>('SET_CONTROL_POSITION')

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
