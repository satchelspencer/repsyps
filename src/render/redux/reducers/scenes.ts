import { createReducer } from 'deox'
import * as _ from 'lodash'
import arrayMove from 'array-move'

import * as Types from 'render/util/types'
import * as Actions from '../actions'
import * as Selectors from '../selectors'
import { defaultState, defaultScene } from '../defaults'
import { applyCue } from './cues'

export function updateSceneIndex(
  live: Types.Live,
  sceneIndex: number,
  forceReset?: boolean
): Types.Live {
  if (!forceReset && sceneIndex === live.sceneIndex) return live
  else {
    const prevActive = Selectors.getActiveTrackIdsFromLive(live, live.sceneIndex),
      nextActive = Selectors.getActiveTrackIdsFromLive(live, sceneIndex),
      noLongerActive = _.difference(prevActive, nextActive),
      controls = live.scenes[sceneIndex].controls

    return {
      ...live,
      tracks: _.mapValues(live.tracks, (track, trackId) => {
        if (!forceReset && !noLongerActive.includes(trackId)) return track
        else {
          const firstCue = track.cues[0],
            cuedTrack: Types.Track = firstCue
              ? applyCue(track, 0)
              : {
                  ...track,
                  nextPlayback: null,
                  nextCueIndex: -1,
                  cueIndex: -1,
                }
          return {
            ...cuedTrack,
            playback: {
              ...cuedTrack.playback,
              playing: false,
              muted: false,
              unpause: false,
            },
          }
        }
      }),
      initValues: _.mapValues(controls, (control, pos) => {
        const binding = live.bindings[pos],
          value = live.controlValues[pos]
        if (binding && !binding.twoway && value !== undefined) return value
        else return 1
      }),
      controlValues: _.mapValues(controls, (control, pos) => {
        const binding = live.bindings[pos],
          value = live.controlValues[pos]
        if (
          (control && !control.absolute && (!binding || binding.twoway)) ||
          value === undefined
        )
          return 1
        else return value
      }),
      sceneIndex,
    }
  }
}

export default createReducer(defaultState, (handle) => [
  handle(Actions.setSceneIndex, (state, { payload: sceneIndex }) => {
    return {
      ...state,
      live: updateSceneIndex(state.live, sceneIndex),
    }
  }),
  handle(Actions.addTrackToScene, (state, { payload }) => {
    const currentScene = state.live.scenes[payload.toSceneIndex] || defaultScene,
      newScenes = [...state.live.scenes],
      isNewToScene = !currentScene.trackIds.includes(payload.trackId),
      insertIndex =
        payload.trackIndex === undefined
          ? currentScene.trackIds.length - 1
          : payload.trackIndex

    const newTracks = {
      ...state.live.tracks,
      [payload.trackId]: {
        ...state.live.tracks[payload.trackId],
        sceneIndex: payload.toSceneIndex,
      },
    }

    if (!isNewToScene) {
      //already in scene just reordering
      newScenes[payload.toSceneIndex] = {
        ...currentScene,
        trackIds: arrayMove(
          currentScene.trackIds,
          currentScene.trackIds.indexOf(payload.trackId),
          insertIndex
        ),
      }
      return {
        ...state,
        live: {
          ...state.live,
          scenes: newScenes,
          tracks: newTracks,
        },
      }
    } else {
      // add track to this scene
      newScenes[payload.toSceneIndex] = {
        ...currentScene,
        trackIds: arrayMove([payload.trackId, ...currentScene.trackIds], 0, insertIndex),
      }
      // remove from old scene
      newScenes[payload.fromSceneIndex] = {
        ...newScenes[payload.fromSceneIndex],
        trackIds: newScenes[payload.fromSceneIndex].trackIds.filter(
          (id) => id !== payload.trackId
        ),
      }

      return {
        ...state,
        live: {
          ...state.live,
          scenes: newScenes,
          tracks: newTracks,
        },
      }
    }
  }),
  handle(Actions.createScene, (state, { payload: sceneIndex }) => {
    const newScenes = [...state.live.scenes],
      newScene = { ...defaultScene }

    if (state.live.defaultPresetId)
      newScene.controls = {
        ...state.live.controlPresets[state.live.defaultPresetId].controls,
      }

    newScenes.splice(sceneIndex, 0, newScene)
    return {
      ...state,
      live: updateSceneIndex(
        {
          ...state.live,
          scenes: newScenes,
        },
        sceneIndex
      ),
    }
  }),
  handle(Actions.deleteScene, (state, { payload: sceneIndex }) => {
    if (state.live.scenes.length == 1) return state
    const newScenes = [...state.live.scenes],
      deletedScene = state.live.scenes[sceneIndex],
      newSceneIndex = Math.min(state.live.sceneIndex, newScenes.length - 2)

    newScenes.splice(sceneIndex, 1)
    return {
      ...state,
      sources: _.omitBy(state.sources, (_, sourceId) =>
        deletedScene.trackIds.includes(sourceId)
      ),
      live: updateSceneIndex(
        {
          ...state.live,
          tracks: _.omitBy(state.live.tracks, (_, trackId) =>
            deletedScene.trackIds.includes(trackId)
          ),
          scenes: newScenes,
        },
        newSceneIndex
      ),
    }
  }),
])
