import { Action } from 'redux'
import { createActionCreator } from 'deox'
import { batchActions } from 'redux-batched-actions'
import pathUtils from 'path'

import * as Types from 'render/util/types'
import mappings from 'render/util/mappings'
import { getId } from 'render/util/uid'

function createAction<Payload>(name) {
  return createActionCreator(name, (res) => (payload: Payload) => res(payload))
}

/* global actions */
export const reset = createAction<void>('RESET_STATE')

export const loadPersisted = createAction<{
  state: Types.PersistentState
  reset?: boolean
}>('LOAD_PERSISTED')

export const loadLocalPersisted = createAction<Types.LocalPersistentState>(
  'LOAD_LOCAL_PERSISTED'
)

export const updateTime = createAction<{
  timing: Types.TimingState
  commit: boolean
}>('UPDATE_TIMES')

export const setSaveStatus = createAction<Types.SaveStatus>('SET_SAVESTATUS')

export const setSettings = createAction<Partial<Types.Settings>>('SET_SETTINGS')

export const setRecording = createAction<Partial<Types.Recording>>('SET_RECORDING')

export const updatePlayback = createAction<Partial<Types.Playback>>('UPDATE_PLAYBACK')

export const updatePlaybackTime = createAction<number>('UPDATE_PLAYBACK_TIME')

export const resetPlaybackTime = createAction<void>('RESET_PLAYBACK_TIME')

export const setOutputs = createAction<Partial<Types.OutputState>>('SET_OUTPUTS')

/* track actions */

export const addTrack = createAction<{
  trackId: string
  sourceTracksParams: Types.TrackSourcesParams
  editing?: boolean
}>('ADD_TRACK')

export const rmTrack = createAction<string>('REMOVE_TRACK')

export function addTrackAndSource(path: string) {
  const id = getId(path),
    name = pathUtils.basename(path)
  return batchActions(
    [
      createSource({
        sourceId: id,
        source: {
          name,
          bounds: [],
          boundsAlpha: 1,
          sourceTracks: {
            [id]: { name, source: path, loaded: false, missing: false, streamIndex: 0 },
          },
        },
      }),
      addTrack({
        trackId: id,
        sourceTracksParams: { [id]: { volume: 1, offset: 0 } },
      }),
      selectTrackExclusive(id),
    ],
    'ADD_TRACK_AND_SOURCE'
  )
}

export const setTrackPlayback = createAction<{
  trackId?: string
  trackIndex?: number
  playback: Partial<Types.TrackPlayback>
}>('SET_TRACK_PLAYBACK')

export const selectTrackExclusive = createAction<string>('SELECT_TRACK_EX')

export const editTrack = createAction<{ trackId: string; edit: boolean }>(
  'SET_TRACK_EDIT'
)

export const setTrackPlayLock = createAction<{
  trackId: string
  playlock: boolean
}>('SET_TRACK_PLAYLOCK')

export const setTrackMuted = createAction<{ trackId: string; muted: boolean }>(
  'SET_TRACK_MUTE'
)

export const setTrackSolo = createAction<{ trackId: string; solo: boolean }>(
  'SET_TRACK_SOLO'
)

export const loopTrack = createAction<{
  trackId?: string
  trackIndex?: number
  loop: number
}>('LOOP_TRACK')

/* source actions */

export const setTrackSourceParams = createAction<{
  trackId?: string
  trackIndex?: number
  sourceTrackId?: string
  sourceTrackIndex?: number
  sourceTrackParams: Partial<Types.TrackSourceParams>
}>('SET_TRACK_SOURCE')

export const soloTrackSource = createAction<{
  trackId?: string
  trackIndex?: number
  sourceTrackId?: string
  sourceTrackIndex?: number
}>('SOLO_TRACKSOURCE')

export const editSourceTrack = createAction<{
  trackId: string
  sourceTrackEditing: string | null
}>('SET_SOURCE_TRACK_EDIT')

export const setVisibleSourceTrack = createAction<{
  trackId: string
  visibleSourceTrack: string
}>('SET_VIS_SOURCE_TRACK')

export const createSource = createAction<{
  sourceId: string
  source: Types.Source
}>('CREATE_SOURCE')

export const createTrackSource = createAction<{
  sourceId: string
  sourceTrackId: string
  sourceTrack: Types.TrackSource
}>('CREATE_TRACKSOURCE')

export const didLoadTrackSource = createAction<{
  sourceId: string
  sourceTrackId: string
  loaded: boolean
  missing?: boolean
}>('DID_LOAD_TRACKSOURCE')

export const relinkTrackSource = createAction<{
  sourceId: string
  sourceTrackId: string
  newSource: string
}>('RELINK_TRACKSOURCE')

export const removeTrackSource = createAction<{
  sourceId: string
  sourceTrackId: string
}>('REMOVE_TRACKSOURCE')

export const setSourceBounds = createAction<{
  sourceId: string
  bounds: number[]
}>('SET_SOURCE_BOUNDS')

export const copyTrackBounds = createAction<{
  src: string
  dest: string
}>('COPY_TRACK_BOUNDS')

export const inferBounds = createAction<{
  sourceId: string
  chunks: number[]
  impulses: number[]
  snap: boolean
  direction: 'left' | 'right' | 'both'
}>('INFER_BOUNDS')

export const setSourceAlpha = createAction<{
  sourceId: string
  boundsAlpha: number
}>('SET_SOURCE_ALPHA')

export const moveSourceTrack = createAction<{
  sourceId: string
  sourceTrackId: string
  source: string
}>('MOVE_SOURCETRACK')

/* cues */

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

export const setTrackSync = createAction<{
  trackId?: string
  trackIndex?: number
  sync: Types.SyncControlState
}>('SET_TRACK_SYNC')

/* controls */

export const setControlGroup = createAction<{
  position: Types.Position
  controlGroup: Partial<Types.ControlGroup>
}>('SET_CONTROL_GROUP')

export const setControlGroupValue = createAction<{
  position: Types.Position
  value: number
}>('SET_CONTROL_GROUP_VALUE')

export const moveControlGroup = createAction<{
  src: Types.Position
  dest: Types.Position
}>('MOVE_CONTROL_GROUP')

export const setInitValue = createAction<{
  position: Types.Position
  value: number
}>('SET_INIT_VALUE')

export const zeroInitValues = createAction<void>('ZERO_INIT_VALUES')

export const clearControls = createAction<void>('CLEAR_CONTROLS')

export const deleteControlGroup = createAction<{
  position: Types.Position
}>('DELETE_CONTROL_GROUP')

export const addControlPreset = createAction<{
  presetId: string
  name: string
}>('ADD_CONTROL_PRESET')

export const deleteControlPreset = createAction<string>('DEL_CONTROL_PRESET')

export const setDefaultControlPreset = createAction<string>('SET_DEFAULT_CONTROL_PRESET')

export const applyControlPreset = createAction<string>('APPLY_CONTROL_PRESET')

export const setControlsEnabled = createAction<boolean>('SET_CONTROLS_ENABLED')

export const setBinding = createAction<{
  position: Types.Position
  binding: Partial<Types.Binding>
}>('SET_BINDING')

export const setBadMidiValue = createAction<{
  position: Types.Position
  badMidiValue: boolean
  lastMidiValue?: number
}>('SET_BAD_MIDI_VALUE')

export const removeBinding = createAction<Types.Position>('REMOVE_BINDING')

export const loadBindings = createAction<Types.BindingsFile>('LOAD_BINDINGS')

export const resetBindings = createAction<void>('RESET_BINDINGS')

export function getApplyControlGroupActions(
  position: Types.Position,
  controlGroup: Types.ControlGroup,
  lastValue: number,
  value: number
) {
  const actions: Action<any>[] = [setControlGroupValue({ position, value })]
  controlGroup.controls.forEach((control) => {
    const thisValue = control.invert ? 1 - value : value,
      thisLastValue = control.invert ? 1 - lastValue : lastValue,
      risingEdge = thisValue > 0.5 && thisLastValue < 0.5

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
    else if ('cueStep' in control && risingEdge)
      actions.push(
        stepTrackCue({
          trackIndex: control.trackIndex,
          cueStep: control.cueStep,
        })
      )
    else if ('cueIndex' in control && risingEdge)
      actions.push(
        setTrackCue({
          trackIndex: control.trackIndex,
          cueIndex: control.cueIndex,
        })
      )
    else if ('loop' in control && risingEdge) {
      actions.push(
        loopTrack({
          trackIndex: control.trackIndex,
          loop: control.loop,
        })
      )
    } else if ('sync' in control && risingEdge) {
      actions.push(setTrackSync({ trackIndex: control.trackIndex, sync: control.sync }))
    }
  })
  return actions
}

export function applyControlGroup(
  position: Types.Position,
  controlGroup: Types.ControlGroup,
  lastValue: number,
  value: number
) {
  return batchActions(
    getApplyControlGroupActions(position, controlGroup, lastValue, value),
    'APPLY_CONTROL'
  )
}

export function applyControlGroupMidi(
  position: Types.Position,
  controlGroup: Types.ControlGroup,
  lastValue: number,
  value: number
) {
  return batchActions(
    [
      ...getApplyControlGroupActions(position, controlGroup, lastValue, value),
      setBadMidiValue({
        position,
        badMidiValue: false,
        lastMidiValue: value,
      }),
    ],
    'APPLY_CONTROL_MIDI'
  )
}

/* scenes */

export const setSceneIndex = createAction<number>('SET_SCENE_INDEX')

export const addTrackToScene = createAction<{
  trackId: string
  toSceneIndex: number
  fromSceneIndex: number
  trackIndex?: number
}>('ADD_TRACK_TO_SCENE')

export const createScene = createAction<number>('CREATE_SCENE')

export const deleteScene = createAction<number>('DELETE_SCENE')
