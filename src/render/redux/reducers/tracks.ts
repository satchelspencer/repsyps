import { createReducer } from 'deox'
import * as _ from 'lodash'

import * as Actions from '../actions'
import * as Selectors from '../selectors'
import { defaultState, defaultTrackPlayback } from '../defaults'
import { updateSceneIndex } from './scenes'

export default createReducer(defaultState, (handle) => [
  handle(Actions.addTrack, (state, { payload }) => {
    const currentScene = state.live.scenes[state.live.sceneIndex],
      newScenes = [...state.live.scenes]
    newScenes[state.live.sceneIndex] = {
      ...currentScene,
      trackIds: _.uniq(currentScene.trackIds.concat(payload.trackId)),
    }

    return {
      ...state,
      live: {
        ...state.live,
        tracks: {
          ...state.live.tracks,
          [payload.trackId]: {
            visibleSourceTrack: payload.trackId,
            playback: {
              ...defaultTrackPlayback,
              sourceTracksParams: payload.sourceTracksParams,
              aperiodic: payload.editing === undefined ? true : payload.editing,
            },
            nextPlayback: null,
            selected: false,
            editing: payload.editing === undefined ? true : payload.editing,
            sourceTrackEditing: null,
            cues: [],
            cueIndex: -1,
            nextCueIndex: -1,
            playLock: false,
            lastPeriod: 0,
          },
        },
        scenes: newScenes,
      },
    }
  }),
  handle(Actions.rmTrack, (state, { payload: trackId }) => {
    const newScenes = state.live.scenes.map((scene) => {
        if (scene.trackIds.includes(trackId)) {
          return {
            ...scene,
            trackIds: scene.trackIds.filter((id) => id !== trackId),
          }
        } else return scene
      }),
      newSceneIndex = Math.min(newScenes.length - 1, state.live.sceneIndex)

    return updateSceneIndex(
      {
        ...state,
        sources: _.omit(state.sources, trackId),
        live: {
          ...state.live,
          scenes: newScenes,
          tracks: _.omit(state.live.tracks, trackId),
        },
      },
      newSceneIndex
    )
  }),
  handle(Actions.setTrackPlayback, (state, { payload }) => {
    const trackId =
      payload.trackId || Selectors.getTrackIdByIndex(state.live, payload.trackIndex)
    let newLive = state.live
    if (trackId) {
      if (!!payload.playback.chunks || !payload.playback.playing)
        newLive = {
          ...state.live,
          tracks: {
            ...state.live.tracks,
            [trackId]: {
              ...state.live.tracks[trackId],
              playback: {
                ...state.live.tracks[trackId].playback,
                ...payload.playback,
                unpause: false,
                nextAtChunk: false,
              },
              nextPlayback: null,
              cueIndex: -1,
              nextCueIndex: -1,
            },
          },
        }
      else {
        newLive = {
          ...state.live,
          tracks: {
            ...state.live.tracks,
            [trackId]: {
              ...state.live.tracks[trackId],
              playback: {
                ...state.live.tracks[trackId].playback,
                ...payload.playback,
                unpause: false,
              },
              lastPeriod: state.playback.period,
            },
          },
        }
      }
    }
    return {
      ...state,
      live: newLive,
      playback: {
        ...state.playback,
        playing: true,
      },
    }
  }),
  handle(Actions.selectTrackExclusive, (state, { payload: trackId }) => {
    const containingIndex = state.live.scenes.findIndex((scene) =>
        scene.trackIds.includes(trackId)
      ),
      inScene = containingIndex !== -1,
      isLastOfScene =
        inScene &&
        state.live.scenes[containingIndex].trackIds.indexOf(trackId) ===
          state.live.scenes[containingIndex].trackIds.length - 1,
      shouldNotJump =
        (isLastOfScene && state.live.sceneIndex === containingIndex + 1) || !inScene,
      newSceneIndex = shouldNotJump ? state.live.sceneIndex : containingIndex

    return updateSceneIndex(
      {
        ...state,
        live: {
          ...state.live,
          tracks: _.mapValues(state.live.tracks, (track, thisTrackId) => {
            if (thisTrackId === trackId) {
              return { ...track, selected: true }
            } else if (track.selected) {
              return { ...track, selected: false }
            } else return track
          }),
        },
      },
      newSceneIndex
    )
  }),
  handle(Actions.editTrack, (state, { payload }) => {
    return {
      ...state,
      live: {
        ...state.live,
        tracks: {
          ...state.live.tracks,
          [payload.trackId]: {
            ...state.live.tracks[payload.trackId],
            editing: payload.edit,
          },
        },
      },
    }
  }),
  handle(Actions.setTrackPlayLock, (state, { payload }) => {
    return {
      ...state,
      live: {
        ...state.live,
        tracks: {
          ...state.live.tracks,
          [payload.trackId]: {
            ...state.live.tracks[payload.trackId],
            playLock: payload.playlock,
          },
        },
      },
    }
  }),
  handle(Actions.setTrackMuted, (state, { payload }) => {
    return {
      ...state,
      live: {
        ...state.live,
        tracks: {
          ...state.live.tracks,
          [payload.trackId]: {
            ...state.live.tracks[payload.trackId],
            playback: {
              ...state.live.tracks[payload.trackId].playback,
              muted: payload.muted,
            },
          },
        },
      },
    }
  }),
  handle(Actions.setTrackSolo, (state, { payload }) => {
    return {
      ...state,
      live: {
        ...state.live,
        tracks: _.mapValues(state.live.tracks, (track, trackId) => {
          return {
            ...track,
            playback: {
              ...track.playback,
              muted: payload.solo ? payload.trackId !== trackId : false,
            },
          }
        }),
      },
    }
  }),
  handle(Actions.loopTrack, (state, { payload }) => {
    const track = state.live.tracks[payload.trackId]
    if (!track) return state
    else {
      const bounds = state.sources[payload.trackId].bounds,
        [chunkStart, chunkLength] = track.playback.chunks.slice(
          track.playback.chunkIndex * 2
        ),
        chunkEnd = chunkStart + chunkLength,
        startBoundIndex = bounds.indexOf(chunkStart),
        endBoundIndex = bounds.indexOf(chunkEnd),
        trackEnd = _.last(bounds),
        desiredCount = payload.loop > 0 ? payload.loop : Infinity

      let newChunks = [chunkStart, chunkLength]

      if (startBoundIndex === -1 || endBoundIndex === -1) {
        //not in bounds
        let start = chunkEnd
        while (start <= trackEnd && newChunks.length / 2 < desiredCount) {
          newChunks.push(start)
          newChunks.push(chunkLength)
          start += chunkLength
        }
      } else {
        const aboveBounds = _.take(
          bounds.filter((b) => b >= chunkStart),
          desiredCount + 1
        )
        newChunks = _.flatten(
          aboveBounds
            .map((bound, boundIndex) => {
              const nextBound = aboveBounds[boundIndex + 1]
              return nextBound && [bound, nextBound - bound]
            })
            .filter((a) => a)
        )
      }
      return {
        ...state,
        live: {
          ...state.live,
          tracks: {
            ...state.live.tracks,
            [payload.trackId]: {
              ...track,
              playback: {
                ...track.playback,
                chunkIndex: 0,
                chunks: newChunks,
              },
            },
          },
        },
      }
    }
  }),
])
