import { combineReducers } from 'redux'
import { createReducer } from 'deox'
import * as _ from 'lodash'
import arrayMove from 'array-move'

import * as Types from 'render/util/types'
import * as Actions from './actions'
import * as Selectors from './selectors'
import { RATE } from 'render/util/audio'
import isEqual from '../util/is-equal'

const defaultPlayback: Types.Playback = {
    volume: 1,
    playing: true,
    period: 2.7 * RATE,
  },
  defaultTrackPlayback: Types.TrackPlayback = {
    chunks: [0, 0],
    alpha: 1,
    playing: false,
    aperiodic: true,
    chunkIndex: -1,
    nextAtChunk: false,
    muted: false,
    sourceTracksParams: {},
  },
  defaultBindings: Types.Bindings = {},
  defaultScene: Types.Scene = {
    controls: {},
    trackIds: [],
  },
  defaultLive: Types.Live = {
    sceneIndex: 0,
    scenes: [defaultScene],
    tracks: {},
  },
  defaultSources: Types.Sources = {},
  defaultTiming: Types.Times = {
    time: 0,
    tracks: {},
  },
  defaultTrackSourceParams: Types.TrackSourceParams = { volume: 0 }

/* if a cue doesnt esist in the new sources, just set its volume in the old to 0. */
function mergeTrackSourcesParams(
  dest: Types.TrackSourcesParams,
  src: Types.TrackSourcesParams
) {
  return _.mapValues(
    {
      ...dest,
      ...src,
    },
    (srcConfig, sourceId) => {
      if (!src[sourceId])
        return {
          ...srcConfig,
          volume: 0,
        }
      else return srcConfig
    }
  )
}

function applyCue(track: Types.Track, cueIndex: number): Types.Track {
  const cue = track.cues[cueIndex],
    followingCue = track.cues[cueIndex + 1]

  if (!cue) return track
  else if (cue.startBehavior === 'immediate') {
    const hasFollowing = cue.endBehavior === 'next' && followingCue
    return {
      ...track,
      cueIndex: cueIndex,
      nextCueIndex: hasFollowing ? cueIndex + 1 : -1,
      playback: {
        ...track.playback,
        ...cue.playback,
        sourceTracksParams: mergeTrackSourcesParams(
          track.playback.sourceTracksParams,
          cue.playback.sourceTracksParams
        ),
      },
      nextPlayback: hasFollowing ? followingCue.playback : null,
    }
  } else if (cue.startBehavior === 'on-chunk' || cue.startBehavior === 'on-end') {
    return {
      ...track,
      nextCueIndex: cueIndex,
      playback: {
        ...track.playback,
        nextAtChunk: cue.startBehavior === 'on-chunk',
      },
      nextPlayback: cue.playback,
    }
  } else return track
}

function propogagteControlPositions(live: Types.Live, startSceneIndex: number) {
  const newLive = {
    ...live,
    scenes: [...live.scenes],
  }

  for (
    let sceneIndex = startSceneIndex + 1;
    sceneIndex < live.scenes.length;
    sceneIndex++
  ) {
    const lastOfPrev = Selectors.getLastOfPrevControls(newLive.scenes, sceneIndex)
    // if we have no lastOfPrev then we can break
    if (_.keys(lastOfPrev).length > 0) {
      newLive.scenes[sceneIndex] = {
        ...newLive.scenes[sceneIndex],
        controls: {
          ...newLive.scenes[sceneIndex].controls,
        },
      }

      let madeChange = false

      _.values(lastOfPrev).forEach(lastControl => {
        const conflictingId = _.find(
            _.keys(newLive.scenes[sceneIndex].controls),
            controlId =>
              isEqual(
                lastControl.position,
                newLive.scenes[sceneIndex].controls[controlId].position
              )
          ),
          conflictingControl =
            conflictingId && newLive.scenes[sceneIndex].controls[conflictingId]

        if (conflictingId) {
          madeChange = true
          newLive.scenes[sceneIndex].controls[conflictingId] = {
            ...newLive.scenes[sceneIndex].controls[conflictingId],
            position: Selectors.getOpenPositionAtIndex(
              newLive,
              conflictingControl.type,
              sceneIndex
            ),
          }
        }
      })
      if (!madeChange) break
    } else break
  }

  return newLive
}

export default combineReducers({
  timing: createReducer(defaultTiming, handle => [
    handle(Actions.updateTime, (timing, { payload }) => {
      return {
        time: payload.timing.time,
        tracks: {
          ...timing.tracks,
          ..._.mapValues(payload.timing.tracks, t => t.sample),
        },
      }
    }),
    handle(Actions.updatePlaybackTime, (timing, { payload: time }) => {
      return {
        ...timing,
        time: timing.time + time,
      }
    }),
    handle(Actions.resetPlaybackTime, timing => {
      return {
        ...timing,
        time: 0,
      }
    }),
  ]),
  sources: createReducer(defaultSources, handle => [
    handle(Actions.createSource, (sources, { payload }) => {
      return {
        ...sources,
        [payload.sourceId]: payload.source,
      }
    }),
    handle(Actions.createTrackSource, (sources, { payload }) => {
      return {
        ...sources,
        [payload.sourceId]: {
          ...sources[payload.sourceId],
          sourceTracks: {
            ...sources[payload.sourceId].sourceTracks,
            [payload.sourceTrackId]: payload.sourceTrack,
          },
        },
      }
    }),
    handle(Actions.copyTrackBounds, (sources, { payload }) => {
      const from = sources[payload.src],
        to = sources[payload.dest]

      if (from && to)
        return {
          ...sources,
          [payload.dest]: {
            ...to,
            bounds: [...from.bounds],
          },
        }
      else return sources
    }),
    handle(Actions.setSourceBounds, (sources, { payload }) => {
      return {
        ...sources,
        [payload.sourceId]: {
          ...sources[payload.sourceId],
          bounds: payload.bounds,
        },
      }
    }),
  ]),
  live: createReducer(defaultLive, handle => [
    handle(Actions.setTrackMuted, (live, { payload }) => {
      return {
        ...live,
        tracks: {
          ...live.tracks,
          [payload.trackId]: {
            ...live.tracks[payload.trackId],
            playback: {
              ...live.tracks[payload.trackId].playback,
              muted: payload.muted,
            },
          },
        },
      }
    }),
    handle(Actions.setTrackSolo, (live, { payload }) => {
      return {
        ...live,
        tracks: _.mapValues(live.tracks, (track, trackId) => {
          return {
            ...track,
            playback: {
              ...track.playback,
              muted: payload.solo ? payload.trackId !== trackId : false,
            },
          }
        }),
      }
    }),
    handle(Actions.reorderCue, (live, { payload }) => {
      const track = live.tracks[payload.trackId],
        newCues = arrayMove(track.cues, payload.oldIndex, payload.newIndex)
      return {
        ...live,
        tracks: {
          ...live.tracks,
          [payload.trackId]: {
            ...track,
            cues: newCues,
          },
        },
      }
    }),
    handle(Actions.addCue, (live, { payload }) => {
      const track = live.tracks[payload.trackId],
        newCues = [...track.cues]
      newCues[payload.index === undefined ? newCues.length : payload.index] = payload.cue
      return {
        ...live,
        tracks: {
          ...live.tracks,
          [payload.trackId]: {
            ...track,
            cues: newCues,
          },
        },
      }
    }),
    handle(Actions.deleteCue, (live, { payload }) => {
      const track = live.tracks[payload.trackId],
        newCues = [...track.cues]
      newCues.splice(payload.index, 1)
      return {
        ...live,
        tracks: {
          ...live.tracks,
          [payload.trackId]: {
            ...track,
            cues: newCues,
          },
        },
      }
    }),
    handle(Actions.applyControl, (live, { payload }) => {
      const control = payload.control
      if (!('trackId' in control) || !live.tracks[control.trackId]) return live
      else if ('sourceTrackId' in control) {
        return {
          ...live,
          tracks: {
            ...live.tracks,
            [control.trackId]: {
              ...live.tracks[control.trackId],
              playback: {
                ...live.tracks[control.trackId].playback,
                sourceTracksParams: {
                  ...live.tracks[control.trackId].playback.sourceTracksParams,
                  [control.sourceTrackId]: {
                    ...live.tracks[control.trackId].playback.sourceTracksParams[
                      control.sourceTrackId
                    ],
                    [control.prop]: payload.value,
                  },
                },
              },
            },
          },
        }
      } else if ('cueIndex' in control && payload.function === 'note-on') {
        return {
          ...live,
          tracks: {
            ...live.tracks,
            [control.trackId]: applyCue(live.tracks[control.trackId], control.cueIndex),
          },
        }
      } else if ('cueStep' in control) {
        const track = live.tracks[control.trackId],
          currentIndex = track.cueIndex,
          nextIndex = currentIndex + control.cueStep

        if (nextIndex >= 0 && nextIndex < track.cues.length) {
          return {
            ...live,
            tracks: {
              ...live.tracks,
              [control.trackId]: applyCue(track, nextIndex),
            },
          }
        } else
          return {
            ...live,
            tracks: {
              ...live.tracks,
              [control.trackId]: {
                ...track,
                playback: {
                  ...track.playback,
                  playing: false,
                },
                nextPlayback: null,
                cueIndex: -1,
              },
            },
          }
      } else return live
    }),
    handle(Actions.setTrackSourceParams, (live, { payload }) => {
      return {
        ...live,
        tracks: {
          ...live.tracks,
          [payload.trackId]: {
            ...live.tracks[payload.trackId],
            playback: {
              ...live.tracks[payload.trackId].playback,
              sourceTracksParams: {
                ...live.tracks[payload.trackId].playback.sourceTracksParams,
                [payload.sourceTrackId]: {
                  ...live.tracks[payload.trackId].playback.sourceTracksParams[
                    payload.sourceTrackId
                  ],
                  ...payload.sourceTrackParams,
                },
              },
            },
          },
        },
      }
    }),
    handle(Actions.createTrackSource, (live, { payload }) => {
      return {
        ...live,
        tracks: {
          ...live.tracks,
          [payload.sourceId]: {
            ...live.tracks[payload.sourceId],
            playback: {
              ...live.tracks[payload.sourceId].playback,
              sourceTracksParams: {
                ...live.tracks[payload.sourceId].playback.sourceTracksParams,
                [payload.sourceTrackId]: defaultTrackSourceParams,
              },
            },
          },
        },
      }
    }),
    handle(Actions.setTrackPlayback, (live, { payload }) => {
      if (!!payload.playback.chunks)
        return {
          ...live,
          tracks: {
            ...live.tracks,
            [payload.trackId]: {
              ...live.tracks[payload.trackId],
              playback: {
                ...live.tracks[payload.trackId].playback,
                ...payload.playback,
                nextAtChunk: false,
              },
              nextPlayback: null,
              cueIndex: -1,
              nextCueIndex: -1,
            },
          },
        }
      else
        return {
          ...live,
          tracks: {
            ...live.tracks,
            [payload.trackId]: {
              ...live.tracks[payload.trackId],
              playback: {
                ...live.tracks[payload.trackId].playback,
                ...payload.playback,
              },
            },
          },
        }
    }),
    handle(Actions.toggleTrack, (live, { payload }) => {
      return {
        ...live,
        tracks: {
          ...live.tracks,
          [payload]: {
            ...live.tracks[payload],
            playback: {
              ...live.tracks[payload].playback,
              playing: !live.tracks[payload].playback.playing,
            },
          },
        },
      }
    }),
    handle(Actions.editTrack, (live, { payload }) => {
      return {
        ...live,
        tracks: {
          ...live.tracks,
          [payload.trackId]: {
            ...live.tracks[payload.trackId],
            editing: payload.edit,
          },
        },
      }
    }),
    handle(Actions.updateTime, (live, { payload }) => {
      let needsUpdate = false
      const newTracks = _.mapValues(live.tracks, (track, trackId) => {
        const trackTiming = payload.timing.tracks[trackId]
        if (!trackTiming) return track
        const didAdvanceChunk =
            track.playback.chunkIndex !== trackTiming.playback.chunkIndex,
          didAdvancePlayback = track.nextPlayback && !trackTiming.nextPlayback

        if (didAdvancePlayback && payload.commit && track.nextCueIndex !== -1) {
          needsUpdate = true
          const appliedCue = track.cues[track.nextCueIndex],
            followingCue = track.cues[track.nextCueIndex + 1],
            hasFollowing = appliedCue.endBehavior === 'next' && followingCue
          return {
            ...track,
            cueIndex: track.nextCueIndex,
            nextCueIndex: hasFollowing ? track.nextCueIndex + 1 : -1,
            playback: {
              ...track.playback,
              ...trackTiming.playback,
              sourceTracksParams: mergeTrackSourcesParams(
                track.playback.sourceTracksParams,
                trackTiming.playback.sourceTracksParams
              ),
              nextAtChunk: false, //wait till end to apply nextPlayback
            },
            nextPlayback: hasFollowing ? followingCue.playback : null,
          }
        } else if (didAdvanceChunk) {
          needsUpdate = true
          return {
            ...track,
            playback: {
              ...track.playback,
              ...trackTiming.playback,
              sourceTracksParams: mergeTrackSourcesParams(
                track.playback.sourceTracksParams,
                trackTiming.playback.sourceTracksParams
              ),
            },
          }
        } else return track
      })
      return needsUpdate
        ? {
            ...live,
            tracks: newTracks,
          }
        : live
    }),
    handle(Actions.deleteScene, (live, { payload: sceneIndex }) => {
      const newScenes = [...live.scenes],
        deletedScene = live.scenes[sceneIndex]

      newScenes.splice(sceneIndex, 1)
      return {
        ...live,
        tracks: _.omitBy(live.tracks, (track, trackId) =>
          deletedScene.trackIds.includes(trackId)
        ),
        scenes: newScenes,
        sceneIndex: Math.min(live.sceneIndex, newScenes.length - 1),
      }
    }),
    handle(Actions.selectTrackExclusive, (live, { payload: trackId }) => {
      const containingIndex = live.scenes.findIndex(scene =>
          scene.trackIds.includes(trackId)
        ),
        inScene = containingIndex !== -1,
        isLastOfScene =
          inScene &&
          live.scenes[containingIndex].trackIds.indexOf(trackId) ===
            live.scenes[containingIndex].trackIds.length - 1,
        shouldNotJump =
          (isLastOfScene && live.sceneIndex === containingIndex + 1) || !inScene

      return {
        ...live,
        tracks: _.mapValues(live.tracks, (track, thisTrackId) => {
          if (thisTrackId === trackId) {
            return { ...track, selected: true }
          } else if (track.selected) {
            return { ...track, selected: false }
          } else return track
        }),
        sceneIndex: shouldNotJump ? live.sceneIndex : containingIndex,
      }
    }),
    handle(Actions.addTrack, (live, { payload }) => {
      const currentScene = live.scenes[live.sceneIndex],
        newScenes = [...live.scenes]
      newScenes[live.sceneIndex] = {
        ...currentScene,
        trackIds: _.uniq(currentScene.trackIds.concat(payload.trackId)),
      }

      return {
        ...live,
        tracks: {
          ...live.tracks,
          [payload.trackId]: {
            playback: {
              ...defaultTrackPlayback,
              sourceTracksParams: payload.sourceTracksParams,
            },
            nextPlayback: null,
            selected: false,
            editing: true,
            cues: [],
            cueIndex: -1,
            nextCueIndex: -1,
          },
        },
        scenes: newScenes,
      }
    }),
    handle(Actions.addTrackToScene, (live, { payload }) => {
      const currentScene = live.scenes[payload.toSceneIndex] || defaultScene,
        newScenes = [...live.scenes],
        isNewToScene = !currentScene.trackIds.includes(payload.trackId),
        insertIndex =
          payload.trackIndex === undefined
            ? currentScene.trackIds.length - 1
            : payload.trackIndex

      const newTracks = {
        ...live.tracks,
        [payload.trackId]: {
          ...live.tracks[payload.trackId],
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
          ...live,
          scenes: newScenes,
          tracks: newTracks,
        }
      } else {
        const trackControls = _.pickBy(
          live.scenes[payload.fromSceneIndex].controls,
          control => 'trackId' in control && control.trackId === payload.trackId
        )

        // add track to this scene
        newScenes[payload.toSceneIndex] = {
          ...currentScene,
          trackIds: arrayMove(
            [payload.trackId, ...currentScene.trackIds],
            0,
            insertIndex
          ),
          controls: {
            ...currentScene.controls,
            ...trackControls,
          },
        }
        // remove from old scene
        newScenes[payload.fromSceneIndex] = {
          ...newScenes[payload.fromSceneIndex],
          trackIds: newScenes[payload.fromSceneIndex].trackIds.filter(
            id => id !== payload.trackId
          ),
          controls: _.omitBy(
            newScenes[payload.fromSceneIndex].controls,
            control => 'trackId' in control && control.trackId === payload.trackId
          ),
        }

        const newLive = {
          ...live,
          scenes: newScenes,
          tracks: newTracks,
        }

        // get the controls of the scene with the new track in valid positions
        _.keys(trackControls).forEach(controlId => {
          const control = newLive.scenes[payload.toSceneIndex].controls[controlId]
          newLive.scenes[payload.toSceneIndex].controls[controlId] = {
            ...control,
            position: Selectors.getOpenPositionAtIndex(
              newLive,
              control.type,
              payload.toSceneIndex
            ),
          }
        })

        return propogagteControlPositions(newLive, payload.toSceneIndex)
      }
    }),
    handle(Actions.rmTrack, (live, { payload: trackId }) => {
      const newScenes = live.scenes.map(scene => {
        if (scene.trackIds.includes(trackId)) {
          return {
            ...scene,
            trackIds: scene.trackIds.filter(id => id !== trackId),
            controls: _.omitBy(
              scene.controls,
              control => 'trackId' in control && control.trackId === trackId
            ),
          }
        } else return scene
      })

      return {
        ...live,
        scenes: newScenes,
        sceneIndex: Math.min(newScenes.length - 1, live.sceneIndex),
        tracks: _.omit(live.tracks, trackId),
      }
    }),
    handle(Actions.createScene, (live, { payload: sceneIndex }) => {
      const newScenes = [...live.scenes]
      if (!newScenes[sceneIndex] || !newScenes[sceneIndex].trackIds.length)
        newScenes[sceneIndex] = defaultScene
      else newScenes.splice(sceneIndex, 0, defaultScene)
      return {
        ...live,
        scenes: newScenes,
        sceneIndex,
      }
    }),
    handle(Actions.setSceneIndex, (live, { payload: sceneIndex }) => {
      const newScenes = [...live.scenes]
      if (!newScenes[sceneIndex]) newScenes[sceneIndex] = defaultScene
      return {
        ...live,
        scenes: newScenes,
        sceneIndex,
      }
    }),
    handle(Actions.addControl, (live, { payload }) => {
      const newScenes = [...live.scenes],
        sceneIndex =
          'trackId' in payload.control
            ? live.scenes.findIndex(scene =>
                scene.trackIds.includes((payload.control as any).trackId)
              )
            : live.sceneIndex

      newScenes[sceneIndex] = {
        ...newScenes[sceneIndex],
        controls: {
          ...newScenes[sceneIndex].controls,
          [payload.controlId]: payload.control,
        },
      }
      return propogagteControlPositions(
        {
          ...live,
          scenes: newScenes,
        },
        sceneIndex
      )
    }),
    handle(Actions.removeControl, (live, { payload: controlId }) => {
      const newScenes = [...live.scenes],
        sceneIndex = live.scenes.findIndex(scene =>
          _.keys(scene.controls).includes(controlId)
        )

      newScenes[sceneIndex] = {
        ...newScenes[sceneIndex],
        controls: _.omit(newScenes[sceneIndex].controls, controlId),
      }
      return {
        ...live,
        scenes: newScenes,
      }
    }),
    handle(Actions.setControlPos, (live, { payload }) => {
      const newScenes = [...live.scenes],
        sceneIndex = live.scenes.findIndex(scene =>
          _.keys(scene.controls).includes(payload.controlId)
        ),
        controls = newScenes[sceneIndex].controls

      newScenes[sceneIndex] = {
        ...newScenes[sceneIndex],
        controls: {
          ...controls,
          [payload.controlId]: {
            ...controls[payload.controlId],
            position: {
              ...controls[payload.controlId].position,
              ...payload.position,
            },
          },
        },
      }
      return propogagteControlPositions(
        {
          ...live,
          scenes: newScenes,
        },
        sceneIndex
      )
    }),
  ]),
  bindings: createReducer(defaultBindings, handle => [
    handle(Actions.addBinding, (bindings, { payload }) => {
      return {
        ...bindings,
        [payload.bindingId]: payload.binding,
      }
    }),
    handle(Actions.removeBinding, (bindings, { payload }) => {
      return _.omit(bindings, payload)
    }),
  ]),
  playback: createReducer(defaultPlayback, handle => [
    handle(Actions.applyControl, (playback, { payload }) => {
      if (!('global' in payload.control)) return playback
      else
        return {
          ...playback,
          [payload.control.prop]: payload.value,
        }
    }),
    handle(Actions.updatePlayback, (playback, { payload }) => {
      return {
        ...playback,
        ...payload,
      }
    }),
  ]),
})
