import { Action } from 'redux'
import { createActionCreator } from 'deox'
import { batchActions } from 'redux-batched-actions'

import * as Types from 'render/util/types'
import mappings from 'render/util/mappings'

function createAction<Payload>(name) {
  return createActionCreator(name, res => (payload: Payload) => res(payload))
}

export const updateTime = createAction<{
  timing: Types.TimingState
  commit: boolean
}>('UPDATE_TIMES')

export const addTrack = createAction<{
  trackId: string
  sourceTracksParams: Types.TrackSourcesParams
}>('ADD_TRACK')

export const rmTrack = createAction<string>('REMOVE_TRACK')

export const setTrackSourceParams = createAction<{
  trackId?: string
  trackIndex?: number
  sourceTrackId?: string
  sourceTrackIndex?: number
  sourceTrackParams: Partial<Types.TrackSourceParams>
}>('SET_TRACK_SOURCE')

export const createSource = createAction<{
  sourceId: string
  source: Types.Source
}>('CREATE_SOURCE')

export const createTrackSource = createAction<{
  sourceId: string
  sourceTrackId: string
  sourceTrack: Types.TrackSource
}>('CREATE_TRACKSOURCE')

export const removeTrackSource = createAction<{
  sourceId: string
  sourceTrackId: string
}>('REMOVE_TRACKSOURCE')

export const setTrackPlayback = createAction<{
  trackId?: string
  trackIndex?: number
  playback: Partial<Types.TrackPlayback>
}>('SET_TRACK_PLAYBACK')

export const setSourceBounds = createAction<{
  sourceId: string
  bounds: number[]
}>('SET_SOURCE_BOUNDS')

export const copyTrackBounds = createAction<{
  src: string
  dest: string
}>('COPY_TRACK_BOUNDS')

export const updatePlayback = createAction<Partial<Types.Playback>>('UPDATE_PLAYBACK')

export const updatePlaybackTime = createAction<number>('UPDATE_PLAYBACK_TIME')

export const resetPlaybackTime = createAction<{}>('RESET_PLAYBACK_TIME')

export const selectTrackExclusive = createAction<string>('SELECT_TRACK_EX')

export const toggleTrack = createAction<string>('TOGGLE_TRACK_PLAYBACK')

export const editTrack = createAction<{ trackId: string; edit: boolean }>(
  'SET_TRACK_EDIT'
)

export const editSourceTrack = createAction<{
  trackId: string
  sourceTrackEditing: string | null
}>('SET_SOURCE_TRACK_EDIT')

export const setVisibleSourceTrack = createAction<{
  trackId: string
  visibleSourceTrack: string
}>('SET_VIS_SOURCE_TRACK')

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

export const stepTrackCue = createAction<{
  trackId?: string
  trackIndex?: number
  cueStep: number
}>('STEP_TRACK_CUE')

export const setTrackCue = createAction<{
  trackId?: string
  trackIndex?: number
  cueIndex: number
}>('SET_TRACK_CUE')

export const setControlGroup = createAction<{
  position: Types.Position
  controlGroup: Partial<Types.ControlGroup>
}>('SET_CONTROL_GROUP')

export const setControlGroupValue = createAction<{
  position: Types.Position
  value: number
}>('SET_CONTROL_GROUP_VALUE')

export const setInitValue = createAction<{
  position: Types.Position
  value: number
}>('SET_INIT_VALUE')

export const zeroInitValues = createAction<{}>('ZERO_INIT_VALUES')

export const deleteControlGroup = createAction<{
  position: Types.Position
}>('DELETE_CONTROL_GROUP')

export const setBinding = createAction<{
  position: Types.Position
  binding: Partial<Types.Binding>
}>('SET_BINDING')

export const removeBinding = createAction<Types.Position>('REMOVE_BINDING')

export const setSceneIndex = createAction<number>('SET_SCENE_INDEX')

export const addTrackToScene = createAction<{
  trackId: string
  toSceneIndex: number
  fromSceneIndex: number
  trackIndex?: number
}>('ADD_TRACK_TO_SCENE')

export const createScene = createAction<number>('CREATE_SCENE')

export const deleteScene = createAction<number>('DELETE_SCENE')

export function applyControlGroup(
  position: Types.Position,
  controlGroup: Types.ControlGroup,
  lastValue: number,
  value: number
) {
  const actions: Action<any>[] = [setControlGroupValue({ position, value })]
  controlGroup.controls.forEach(control => {
    if (controlGroup.absolute && 'globalProp' in control)
      actions.push(
        updatePlayback({
          [control.globalProp]: mappings[control.globalProp].fromStandard(value),
        })
      )
    else if (controlGroup.absolute && 'trackProp' in control)
      actions.push(
        setTrackPlayback({
          trackIndex: control.trackIndex,
          playback: {
            [control.trackProp]: mappings[control.trackProp].fromStandard(value),
          },
        })
      )
    else if (controlGroup.absolute && 'sourceTrackProp' in control)
      actions.push(
        setTrackSourceParams({
          trackIndex: control.trackIndex,
          sourceTrackIndex: control.sourceTrackIndex,
          sourceTrackParams: {
            [control.sourceTrackProp]: mappings[control.sourceTrackProp].fromStandard(
              value
            ),
          },
        })
      )
    else if ('cueStep' in control && value > 0.5 && lastValue < 0.5)
      actions.push(
        stepTrackCue({
          trackIndex: control.trackIndex,
          cueStep: control.cueStep,
        })
      )
    else if ('cueIndex' in control && value > 0.5 && lastValue < 0.5)
      actions.push(
        setTrackCue({
          trackIndex: control.trackIndex,
          cueIndex: control.cueIndex,
        })
      )
  })
  return batchActions(actions, 'APPLY_CONTROL')
}
