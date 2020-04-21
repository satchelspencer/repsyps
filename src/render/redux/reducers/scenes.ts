import { createReducer } from 'deox'
import * as _ from 'lodash'
import arrayMove from 'array-move'
import pathUtils from 'path'

import * as Types from 'render/util/types'
import * as Actions from '../actions'
import * as Selectors from '../selectors'
import { defaultState, defaultScene } from '../defaults'
import { applyCue } from './cues'
import uid from 'render/util/uid'
import { remap } from 'render/util/remap'

import globalReducer, { updateSourcesPaths } from './global'
import { getChunksFromBounds } from './tracks'

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
      controlValues = Selectors.getCurrentControlValues(state),
      prevScene = state.live.scenes[sceneIndex - 1],
      lastOfPrevId = prevScene && _.last(prevScene.trackIds),
      lastIsPlaying = lastOfPrevId && state.live.tracks[lastOfPrevId].playback.playing,
      firstTrack = scene.trackIds[0] && state.live.tracks[scene.trackIds[0]],
      resetPeriod =
        firstTrack &&
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
      timing: {
        ...state.timing,
        tracks: _.omit(state.timing.tracks, noLongerActive),
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
                chunks:
                  !cuedTrack.playback.aperiodic && !firstCue && forceReset
                    ? getChunksFromBounds(0, state.sources[trackId].bounds)
                    : cuedTrack.playback.chunks,
                playing: false,
                muted: false,
                unpause: false,
              },
            }
          }
        }),
        scenes: state.live.scenes.map((scene, i) => {
          if (sceneIndex !== i) return scene
          else
            return {
              ...scene,
              controlValues: _.mapValues(controls, (control, pos) => {
                const binding = state.live.bindings[pos],
                  rvalue = controlValues[pos],
                  value = rvalue === undefined ? 1 : rvalue
                if (control && !control.absolute)
                  return !binding || binding.twoway ? 1 : value > 0.5 ? 1 : 0
                else return value
              }),
              initValues: _.mapValues(controls, (control, pos) => {
                const binding = state.live.bindings[pos],
                  value = controlValues[pos]
                if (binding && !binding.twoway && value !== undefined) return value
                else return 1
              }),
            }
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
  handle(Actions.cycleScenes, (state, { payload: startingSceneIndex }) => {
    if (startingSceneIndex >= state.live.scenes.length) return state
    else {
      const newScenes = [...state.live.scenes],
        movedScene = newScenes.splice(startingSceneIndex, 1)
      return {
        ...state,
        live: {
          ...state.live,
          scenes: newScenes.concat(movedScene),
        },
      }
    }
  }),
  handle(Actions.deleteAfter, (state, { payload: afterSceneIndex }) => {
    return {
      ...state,
      live: {
        ...state.live,
        scenes: state.live.scenes.slice(0, afterSceneIndex + 1),
      },
    }
  }),
  handle(Actions.loadScenes, (state, { payload }) => {
    const newState = globalReducer(
        defaultState,
        Actions.loadPersisted({
          state: payload.state,
          reset: true,
        })
      ),
      idMap: { [id: string]: string } = {}

    _.each(newState.sources, (source, sourceId) => {
      if (state.sources[sourceId]) {
        const suffix = '_' + uid().substr(0, 5)
        idMap[sourceId] = sourceId + suffix
        _.each(source.sourceTracks, (_, sourceTrackId) => {
          idMap[sourceTrackId] = sourceTrackId + suffix
        })
      }
    })

    const mappedState = remap(newState, idMap),
      newScenes = [...state.live.scenes]
    newScenes.splice(payload.insertIndex, 0, ...mappedState.live.scenes)

    return {
      ...state,
      sources: {
        ...state.sources,
        ...updateSourcesPaths(
          mappedState.sources,
          payload.fromPath,
          state.save.path && pathUtils.dirname(state.save.path)
        ),
      },
      live: {
        ...state.live,
        tracks: {
          ...state.live.tracks,
          ..._.mapValues(mappedState.live.tracks, (track) => ({
            ...track,
            selected: false,
          })),
        },
        scenes: newScenes,
      },
    }
  }),
])
