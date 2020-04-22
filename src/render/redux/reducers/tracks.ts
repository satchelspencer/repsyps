import { createReducer } from 'deox'
import * as _ from 'lodash'

import * as Actions from '../actions'
import * as Selectors from '../selectors'
import * as Types from 'render/util/types'
import { defaultState, defaultTrackPlayback } from '../defaults'
import { updateSceneIndex } from './scenes'
import audio from 'render/util/audio'
import uid from 'src/render/util/uid'
import { IdMap, applyIdMap } from 'render/util/remap'
import { getTiming } from 'render/components/timing'

export function getChunksFromBounds(startSample: number, bounds: number[]) {
  const aboveBounds = _.filter(bounds, (b, bi) => {
    const next = bounds[bi + 1]
    return next >= startSample
  })
  return _.flatten(
    aboveBounds
      .map((bound, boundIndex) => {
        const nextBound = aboveBounds[boundIndex + 1]
        return nextBound && [bound, nextBound - bound]
      })
      .filter((a) => a)
  )
}

export function applyTrackPlayback(
  state: Types.State,
  trackId: string,
  playback: Partial<Types.TrackPlayback>
) {
  const track = state.live.tracks[trackId]
  let newLive = state.live,
    newTracks = newLive.tracks

  if (!track) return state
  if (!state.playback.playing)
    newTracks = _.mapValues(newTracks, (track) =>
      track.playback.playing
        ? {
            ...track,
            playback: {
              ...track.playback,
              playing: false,
              unpause: false,
            },
          }
        : track
    )

  if (trackId) {
    if (!!playback.chunks)
      newLive = {
        ...state.live,
        tracks: {
          ...newTracks,
          [trackId]: {
            ...track,
            playback: {
              ...track.playback,
              ...playback,
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
          ...newTracks,
          [trackId]: {
            ...track,
            playback: {
              ...track.playback,
              ...playback,
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
}

export function selectTrack(state: Types.State, trackId: string) {
  const containingIndex = state.live.scenes.findIndex((scene) =>
      scene.trackIds.includes(trackId)
    ),
    inScene = containingIndex !== -1,
    shouldNotJump = state.live.sceneIndex === containingIndex + 1 || !inScene,
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
            return { ...track, selected: false, editing: false }
          } else return track
        }),
      },
    },
    newSceneIndex
  )
}

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
  handle(Actions.playPauseTrack, (state, { payload: trackId }) => {
    const track = state.live.tracks[trackId],
      isPlaying = state.playback.playing
    if (!track) return state
    else
      return applyTrackPlayback(state, trackId, {
        playing: isPlaying ? !track.playback.playing : true,
        chunkIndex: -1,
      })
  }),
  handle(Actions.toggleTrackLoop, (state, { payload: trackId }) => {
    const track = state.live.tracks[trackId]
    if (!track) return state
    else
      return applyTrackPlayback(state, trackId, {
        loop: !track.playback.loop,
      })
  }),
  handle(Actions.setTrackPlayback, (state, { payload }) => {
    const trackId =
      payload.trackId || Selectors.getTrackIdByIndex(state.live, payload.trackIndex)
    return applyTrackPlayback(state, trackId, payload.playback)
  }),
  handle(Actions.stopAll, (state) => {
    return {
      ...state,
      live: {
        ...state.live,
        tracks: _.mapValues(state.live.tracks, (track) => {
          return {
            ...track,
            playback: {
              ...track.playback,
              unpause: false,
              playing: false,
            },
          }
        }),
      },
      playback: {
        ...state.playback,
        playing: false,
      },
    }
  }),
  handle(Actions.setTrackSync, (state, { payload }) => {
    const trackId =
        payload.trackId || Selectors.getTrackIdByIndex(state.live, payload.trackIndex),
      playback = state.live.tracks[trackId].playback,
      sync =
        payload.sync === undefined ? (playback.aperiodic ? 'on' : 'off') : payload.sync,
      aperiodic = sync === 'off',
      isLoop = !!playback.chunks[playback.chunkIndex * 2 + 1],
      { bounds, boundsAlpha } = state.sources[trackId],
      sample = (getTiming().tracks[trackId] || { sample: 0 }).sample,
      newPlayback = {
        ...playback,
        aperiodic,
      }
    let newPeriod = null

    if (!aperiodic && !isLoop && bounds.length && sample)
      newPlayback.chunks = getChunksFromBounds(sample, bounds)

    if (sync === 'lock') {
      const nextBoundIndex = _.findIndex(bounds, (b) => {
          return b > sample
        }),
        boundIndex = nextBoundIndex - 1

      if (nextBoundIndex !== -1 && boundIndex !== -1) {
        if (playback.aperiodic)
          audio.syncToTrack(trackId, bounds[boundIndex], bounds[nextBoundIndex])
        newPeriod =
          (bounds[nextBoundIndex] - bounds[boundIndex]) * playback.alpha * boundsAlpha
      }
    }

    return {
      ...state,
      playback: newPeriod
        ? {
            ...state.playback,
            period: newPeriod,
          }
        : state.playback,
      live: {
        ...state.live,
        tracks: {
          ...state.live.tracks,
          [trackId]: {
            ...state.live.tracks[trackId],
            playback: newPlayback,
          },
        },
      },
    }
  }),
  handle(Actions.selectTrackExclusive, (state, { payload: trackId }) => {
    return selectTrack(state, trackId)
  }),
  handle(Actions.stepSelectedTrack, (state, { payload: step }) => {
    const trackIds = _.flatMap(state.live.scenes, (scene) => scene.trackIds),
      selectedTrackId = Selectors.getSelectedTrackId(state)

    return selectTrack(
      state,
      trackIds[
        Math.min(
          Math.max(trackIds.indexOf(selectedTrackId) + step, 0),
          trackIds.length - 1
        )
      ]
    )
  }),
  handle(Actions.selectTrackByIndex, (state, { payload: trackIndex }) => {
    const trackIds = Selectors.getActiveTrackIds(state)
    if (!trackIds[trackIndex]) return state
    else return selectTrack(state, trackIds[trackIndex])
  }),
  handle(Actions.editTrack, (state, { payload }) => {
    const track = state.live.tracks[payload.trackId]
    return applyTrackPlayback(
      {
        ...state,
        live: {
          ...state.live,
          tracks: {
            ...state.live.tracks,
            [payload.trackId]: {
              ...track,
              editing: payload.edit,
              sourceTrackEditing: payload.edit ? track.sourceTrackEditing : null,
            },
          },
        },
      },
      payload.trackId,
      {
        aperiodic: payload.edit,
      }
    )
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
    const toggle = payload.muted === undefined
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
              muted: toggle
                ? !state.live.tracks[payload.trackId].playback.muted
                : payload.muted,
            },
          },
        },
      },
    }
  }),
  handle(Actions.setTrackSolo, (state, { payload }) => {
    const toggle = payload.solo === undefined,
      solo = toggle ? !Selectors.getTrackIsSolo(state, payload.trackId) : payload.solo
    return {
      ...state,
      live: {
        ...state.live,
        tracks: _.mapValues(state.live.tracks, (track, trackId) => {
          return {
            ...track,
            playback: {
              ...track.playback,
              muted: solo ? payload.trackId !== trackId : false,
            },
          }
        }),
      },
    }
  }),
  handle(Actions.loopTrack, (state, { payload }) => {
    const trackId =
        payload.trackId || Selectors.getTrackIdByIndex(state.live, payload.trackIndex),
      track = state.live.tracks[trackId]

    if (!track) return state
    else {
      const bounds = state.sources[trackId].bounds,
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
            [trackId]: {
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
  handle(Actions.duplicateTrack, (state, { payload: trackId }) => {
    const suffix = '_' + uid().substr(0, 5),
      newTrackId = trackId + suffix

    const idMap: IdMap = {}
    _.each(
      state.sources[trackId].sourceTracks,
      (_, sourceTrackId) => (idMap[sourceTrackId] = sourceTrackId + suffix)
    )

    const newSource = applyIdMap(state.sources[trackId], idMap),
      newTrack = applyIdMap(state.live.tracks[trackId], idMap)

    return {
      ...state,
      sources: {
        ...state.sources,
        [newTrackId]: {
          ...newSource,
          sourceTracks: _.mapValues(newSource.sourceTracks, (sourceTrack) => ({
            ...sourceTrack,
            loaded: false,
          })),
        },
      },
      live: {
        ...state.live,
        tracks: {
          ..._.mapValues(state.live.tracks, (t) =>
            t.selected ? { ...t, selected: false } : t
          ),
          [newTrackId]: {
            ...newTrack,
            visibleSourceTrack: newTrack.visibleSourceTrack + suffix,
            selected: true,
          },
        },
        scenes: _.map(state.live.scenes, (scene) => {
          const trackIndex = scene.trackIds.indexOf(trackId)
          if (trackIndex !== -1) {
            const newTrackIds = [...scene.trackIds]
            newTrackIds.splice(trackIndex + 1, 0, newTrackId)
            return {
              ...scene,
              trackIds: newTrackIds,
            }
          } else return scene
        }),
      },
    }
  }),
  handle(Actions.stopPrevTracks, (state) => {
    const sceneIndex = state.live.sceneIndex
    if (sceneIndex === 0) return state
    else {
      const prevTracks = state.live.scenes[sceneIndex - 1].trackIds
      return {
        ...state,
        live: {
          ...state.live,
          tracks: _.mapValues(state.live.tracks, (track, trackId) => {
            if (prevTracks.includes(trackId)) {
              return {
                ...track,
                playback: {
                  ...track.playback,
                  playing: false,
                  unpause: false,
                },
                nextPlayback: null,
                cueIndex: -1,
                nextCueIndex: -1,
              }
            } else return track
          }),
        },
      }
    }
  }),
])
