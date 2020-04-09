import { createReducer } from 'deox'
import * as _ from 'lodash'
import arrayMove from 'array-move'

import * as Types from 'render/util/types'
import * as Actions from '../actions'
import * as Selectors from '../selectors'
import { defaultState, defaultScene } from '../defaults'
import { applyCue } from './cues'

export function updateSceneIndex(
  state: Types.State,
  sceneIndex: number,
  forceReset?: boolean
): Types.State {
  if (!forceReset && sceneIndex === state.live.sceneIndex) return state
  else {
    const scene = state.live.scenes[sceneIndex],
      prevActive = Selectors.getActiveTrackIdsFromLive(state.live, state.live.sceneIndex),
      nextActive = Selectors.getActiveTrackIdsFromLive(state.live, sceneIndex),
      noLongerActive = _.difference(prevActive, nextActive),
      controls = scene.controls,
      prevScene = state.live.scenes[sceneIndex - 1],
      lastOfPrevId = prevScene && _.last(prevScene.trackIds),
      lastIsPlaying = lastOfPrevId && state.live.tracks[lastOfPrevId].playback.playing,
      firstTrack = scene.trackIds[0] && state.live.tracks[scene.trackIds[0]],
      resetPeriod =
        firstTrack.lastPeriod &&
        (forceReset ||
          sceneIndex !== state.live.sceneIndex + 1 ||
          !state.playback.playing ||
          !lastIsPlaying)

    return {
      ...state,
      playback: {
        ...state.playback,
        period: resetPeriod ? firstTrack.lastPeriod : state.playback.period,
      },
      live: {
        ...state.live,
        tracks: _.mapValues(state.live.tracks, (track, trackId) => {
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
          const binding = state.live.bindings[pos],
            value = state.live.controlValues[pos]
          if (binding && !binding.twoway && value !== undefined) return value
          else return 1
        }),
        controlValues: _.mapValues(controls, (control, pos) => {
          const binding = state.live.bindings[pos],
            value = state.live.controlValues[pos]
          if (
            (control && !control.absolute && (!binding || binding.twoway)) ||
            value === undefined
          )
            return 1
          else return value
        }),
        sceneIndex,
      },
    }
  }
}

export default createReducer(defaultState, (handle) => [
  handle(Actions.setSceneIndex, (state, { payload: sceneIndex }) => {
    return updateSceneIndex(state, sceneIndex)
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
    return updateSceneIndex(
      {
        ...state,
        live: {
          ...state.live,
          scenes: newScenes,
        },
      },
      sceneIndex
    )
  }),
  handle(Actions.deleteScene, (state, { payload: sceneIndex }) => {
    if (state.live.scenes.length == 1) return state
    const newScenes = [...state.live.scenes],
      deletedScene = state.live.scenes[sceneIndex],
      newSceneIndex = Math.min(state.live.sceneIndex, newScenes.length - 2)

    newScenes.splice(sceneIndex, 1)
    return updateSceneIndex(
      {
        ...state,
        sources: _.omitBy(state.sources, (_, sourceId) =>
          deletedScene.trackIds.includes(sourceId)
        ),
        live: {
          ...state.live,
          tracks: _.omitBy(state.live.tracks, (_, trackId) =>
            deletedScene.trackIds.includes(trackId)
          ),
          scenes: newScenes,
        },
      },
      newSceneIndex
    )
  }),
])
