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
    trackSourcesParams: {},
  },
  defaultBindings: Types.Bindings = {},
  defaultScene: Types.Scene = {
    controls: {},
    trackIds: [],
  },
  defaultScenes: Types.Scenes = {
    sceneIndex: 0,
    list: [defaultScene],
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
        trackSourcesParams: mergeTrackSourcesParams(
          track.playback.trackSourcesParams,
          cue.playback.trackSourcesParams
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

function propogagteControlPositions(scenes: Types.Scenes, startSceneIndex: number) {
  const newScenes = {
    ...scenes,
    list: [...scenes.list],
  }

  for (
    let sceneIndex = startSceneIndex + 1;
    sceneIndex < scenes.list.length;
    sceneIndex++
  ) {
    const lastOfPrev = Selectors.getLastOfPrevControls(newScenes, sceneIndex)
    // if we have no lastOfPrev then we can break
    if (_.keys(lastOfPrev).length > 0) {
      newScenes.list[sceneIndex] = {
        ...newScenes.list[sceneIndex],
        controls: {
          ...newScenes.list[sceneIndex].controls,
        },
      }

      let madeChange = false

      _.values(lastOfPrev).forEach(lastControl => {
        const conflictingId = _.find(
            _.keys(newScenes.list[sceneIndex].controls),
            controlId =>
              isEqual(
                lastControl.position,
                newScenes.list[sceneIndex].controls[controlId].position
              )
          ),
          conflictingControl =
            conflictingId && newScenes.list[sceneIndex].controls[conflictingId]

        if (conflictingId) {
          madeChange = true
          newScenes.list[sceneIndex].controls[conflictingId] = {
            ...newScenes.list[sceneIndex].controls[conflictingId],
            position: Selectors.getOpenPositionAtIndex(
              newScenes,
              conflictingControl.type,
              sceneIndex
            ),
          }
        }
      })
      if (!madeChange) break
    } else break
  }

  return newScenes
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
          trackSources: {
            ...sources[payload.sourceId].trackSources,
            [payload.trackSourceId]: payload.trackSource,
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
  scenes: createReducer(defaultScenes, handle => [
    handle(Actions.setTrackMuted, (scenes, { payload }) => {
      return {
        ...scenes,
        tracks: {
          ...scenes.tracks,
          [payload.trackId]: {
            ...scenes.tracks[payload.trackId],
            playback: {
              ...scenes.tracks[payload.trackId].playback,
              muted: payload.muted,
            },
          },
        },
      }
    }),
    handle(Actions.setTrackSolo, (scenes, { payload }) => {
      return {
        ...scenes,
        tracks: _.mapValues(scenes.tracks, (track, trackId) => {
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
    handle(Actions.reorderCue, (scenes, { payload }) => {
      const track = scenes.tracks[payload.trackId],
        newCues = arrayMove(track.cues, payload.oldIndex, payload.newIndex)
      return {
        ...scenes,
        tracks: {
          ...scenes.tracks,
          [payload.trackId]: {
            ...track,
            cues: newCues,
          },
        },
      }
    }),
    handle(Actions.addCue, (scenes, { payload }) => {
      const track = scenes.tracks[payload.trackId],
        newCues = [...track.cues]
      newCues[payload.index === undefined ? newCues.length : payload.index] = payload.cue
      return {
        ...scenes,
        tracks: {
          ...scenes.tracks,
          [payload.trackId]: {
            ...track,
            cues: newCues,
          },
        },
      }
    }),
    handle(Actions.deleteCue, (scenes, { payload }) => {
      const track = scenes.tracks[payload.trackId],
        newCues = [...track.cues]
      newCues.splice(payload.index, 1)
      return {
        ...scenes,
        tracks: {
          ...scenes.tracks,
          [payload.trackId]: {
            ...track,
            cues: newCues,
          },
        },
      }
    }),
    handle(Actions.applyControl, (scenes, { payload }) => {
      const control = payload.control
      if (!('trackId' in control) || !scenes.tracks[control.trackId]) return scenes
      else if ('trackSourceId' in control) {
        return {
          ...scenes,
          tracks: {
            ...scenes.tracks,
            [control.trackId]: {
              ...scenes.tracks[control.trackId],
              playback: {
                ...scenes.tracks[control.trackId].playback,
                trackSourcesParams: {
                  ...scenes.tracks[control.trackId].playback.trackSourcesParams,
                  [control.trackSourceId]: {
                    ...scenes.tracks[control.trackId].playback.trackSourcesParams[
                      control.trackSourceId
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
          ...scenes,
          tracks: {
            ...scenes.tracks,
            [control.trackId]: applyCue(scenes.tracks[control.trackId], control.cueIndex),
          },
        }
      } else if ('cueStep' in control) {
        const track = scenes.tracks[control.trackId],
          currentIndex = track.cueIndex,
          nextIndex = currentIndex + control.cueStep

        if (nextIndex >= 0 && nextIndex < track.cues.length) {
          return {
            ...scenes,
            tracks: {
              ...scenes.tracks,
              [control.trackId]: applyCue(track, nextIndex),
            },
          }
        } else
          return {
            ...scenes,
            tracks: {
              ...scenes.tracks,
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
      } else return scenes
    }),
    handle(Actions.setTrackSourceParams, (scenes, { payload }) => {
      return {
        ...scenes,
        tracks: {
          ...scenes.tracks,
          [payload.trackId]: {
            ...scenes.tracks[payload.trackId],
            playback: {
              ...scenes.tracks[payload.trackId].playback,
              trackSourcesParams: {
                ...scenes.tracks[payload.trackId].playback.trackSourcesParams,
                [payload.trackSourceId]: {
                  ...scenes.tracks[payload.trackId].playback.trackSourcesParams[
                    payload.trackSourceId
                  ],
                  ...payload.trackSourceParams,
                },
              },
            },
          },
        },
      }
    }),
    handle(Actions.createTrackSource, (scenes, { payload }) => {
      return {
        ...scenes,
        tracks: {
          ...scenes.tracks,
          [payload.sourceId]: {
            ...scenes.tracks[payload.sourceId],
            playback: {
              ...scenes.tracks[payload.sourceId].playback,
              trackSourcesParams: {
                ...scenes.tracks[payload.sourceId].playback.trackSourcesParams,
                [payload.trackSourceId]: defaultTrackSourceParams,
              },
            },
          },
        },
      }
    }),
    handle(Actions.setTrackPlayback, (scenes, { payload }) => {
      if (!!payload.playback.chunks)
        return {
          ...scenes,
          tracks: {
            ...scenes.tracks,
            [payload.trackId]: {
              ...scenes.tracks[payload.trackId],
              playback: {
                ...scenes.tracks[payload.trackId].playback,
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
          ...scenes,
          tracks: {
            ...scenes.tracks,
            [payload.trackId]: {
              ...scenes.tracks[payload.trackId],
              playback: {
                ...scenes.tracks[payload.trackId].playback,
                ...payload.playback,
              },
            },
          },
        }
    }),
    handle(Actions.toggleTrack, (scenes, { payload }) => {
      return {
        ...scenes,
        tracks: {
          ...scenes.tracks,
          [payload]: {
            ...scenes.tracks[payload],
            playback: {
              ...scenes.tracks[payload].playback,
              playing: !scenes.tracks[payload].playback.playing,
            },
          },
        },
      }
    }),
    handle(Actions.editTrack, (scenes, { payload }) => {
      return {
        ...scenes,
        tracks: {
          ...scenes.tracks,
          [payload.trackId]: {
            ...scenes.tracks[payload.trackId],
            editing: payload.edit,
          },
        },
      }
    }),
    handle(Actions.updateTime, (scenes, { payload }) => {
      return {
        ...scenes,
        tracks: _.mapValues(scenes.tracks, (track, trackId) => {
          const trackTiming = payload.timing.tracks[trackId]
          if (!trackTiming) return track
          const didAdvanceChunk =
              track.playback.chunkIndex !== trackTiming.playback.chunkIndex,
            didAdvancePlayback = track.nextPlayback && !trackTiming.nextPlayback

          if (didAdvancePlayback && payload.commit && track.nextCueIndex !== -1) {
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
                trackSourcesParams: mergeTrackSourcesParams(
                  track.playback.trackSourcesParams,
                  trackTiming.playback.trackSourcesParams
                ),
                nextAtChunk: false, //wait till end to apply nextPlayback
              },
              nextPlayback: hasFollowing ? followingCue.playback : null,
            }
          } else if (didAdvanceChunk) {
            return {
              ...track,
              playback: {
                ...track.playback,
                ...trackTiming.playback,
                trackSourcesParams: mergeTrackSourcesParams(
                  track.playback.trackSourcesParams,
                  trackTiming.playback.trackSourcesParams
                ),
              },
            }
          } else return track
        }),
      }
    }),
    handle(Actions.deleteScene, (scenes, { payload: sceneIndex }) => {
      const newList = [...scenes.list],
        deletedScene = scenes.list[sceneIndex]

      newList.splice(sceneIndex, 1)
      return {
        ...scenes,
        tracks: _.omitBy(scenes.tracks, (track, trackId) =>
          deletedScene.trackIds.includes(trackId)
        ),
        list: newList,
        sceneIndex: Math.min(scenes.sceneIndex, newList.length - 1),
      }
    }),
    handle(Actions.selectTrackExclusive, (scenes, { payload: trackId }) => {
      const containingIndex = scenes.list.findIndex(scene =>
          scene.trackIds.includes(trackId)
        ),
        inScene = containingIndex !== -1,
        isLastOfScene =
          inScene &&
          scenes.list[containingIndex].trackIds.indexOf(trackId) ===
            scenes.list[containingIndex].trackIds.length - 1,
        shouldNotJump =
          (isLastOfScene && scenes.sceneIndex === containingIndex + 1) || !inScene

      return {
        ...scenes,
        tracks: _.mapValues(scenes.tracks, (track, thisTrackId) => {
          if (thisTrackId === trackId) {
            return { ...track, selected: true }
          } else if (track.selected) {
            return { ...track, selected: false }
          } else return track
        }),
        sceneIndex: shouldNotJump ? scenes.sceneIndex : containingIndex,
      }
    }),
    handle(Actions.addTrack, (scenes, { payload }) => {
      const currentScene = scenes.list[scenes.sceneIndex],
        newList = [...scenes.list]
      newList[scenes.sceneIndex] = {
        ...currentScene,
        trackIds: _.uniq(currentScene.trackIds.concat(payload.trackId)),
      }

      return {
        ...scenes,
        tracks: {
          ...scenes.tracks,
          [payload.trackId]: {
            playback: {
              ...defaultTrackPlayback,
              trackSourcesParams: payload.trackSourcesParams,
            },
            nextPlayback: null,
            selected: false,
            editing: true,
            cues: [],
            cueIndex: -1,
            nextCueIndex: -1,
          },
        },
        list: newList,
      }
    }),
    handle(Actions.addTrackToScene, (scenes, { payload }) => {
      const currentScene = scenes.list[payload.toSceneIndex] || defaultScene,
        newList = [...scenes.list],
        isNewToScene = !currentScene.trackIds.includes(payload.trackId),
        insertIndex =
          payload.trackIndex === undefined
            ? currentScene.trackIds.length - 1
            : payload.trackIndex

      const newTracks = {
        ...scenes.tracks,
        [payload.trackId]: {
          ...scenes.tracks[payload.trackId],
          sceneIndex: payload.toSceneIndex,
        },
      }

      if (!isNewToScene) {
        //already in scene just reordering
        newList[payload.toSceneIndex] = {
          ...currentScene,
          trackIds: arrayMove(
            currentScene.trackIds,
            currentScene.trackIds.indexOf(payload.trackId),
            insertIndex
          ),
        }
        return {
          ...scenes,
          list: newList,
          tracks: newTracks,
        }
      } else {
        const trackControls = _.pickBy(
          scenes.list[payload.fromSceneIndex].controls,
          control => 'trackId' in control && control.trackId === payload.trackId
        )

        // add track to this scene
        newList[payload.toSceneIndex] = {
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
        newList[payload.fromSceneIndex] = {
          ...newList[payload.fromSceneIndex],
          trackIds: newList[payload.fromSceneIndex].trackIds.filter(
            id => id !== payload.trackId
          ),
          controls: _.omitBy(
            newList[payload.fromSceneIndex].controls,
            control => 'trackId' in control && control.trackId === payload.trackId
          ),
        }

        const newScenes = {
          ...scenes,
          list: newList,
          tracks: newTracks,
        }

        // get the controls of the scene with the new track in valid positions
        _.keys(trackControls).forEach(controlId => {
          const control = newScenes.list[payload.toSceneIndex].controls[controlId]
          newScenes.list[payload.toSceneIndex].controls[controlId] = {
            ...control,
            position: Selectors.getOpenPositionAtIndex(
              newScenes,
              control.type,
              payload.toSceneIndex
            ),
          }
        })

        return propogagteControlPositions(newScenes, payload.toSceneIndex)
      }
    }),
    handle(Actions.rmTrack, (scenes, { payload: trackId }) => {
      const newScenesList = scenes.list.map(scene => {
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
        ...scenes,
        list: newScenesList,
        sceneIndex: Math.min(newScenesList.length - 1, scenes.sceneIndex),
        tracks: _.omit(scenes.tracks, trackId),
      }
    }),
    handle(Actions.createScene, (scenes, { payload: sceneIndex }) => {
      const newList = [...scenes.list]
      if (!newList[sceneIndex] || !newList[sceneIndex].trackIds.length)
        newList[sceneIndex] = defaultScene
      else newList.splice(sceneIndex, 0, defaultScene)
      return {
        ...scenes,
        list: newList,
        sceneIndex,
      }
    }),
    handle(Actions.setSceneIndex, (scenes, { payload: sceneIndex }) => {
      const newList = [...scenes.list]
      if (!newList[sceneIndex]) newList[sceneIndex] = defaultScene
      return {
        ...scenes,
        list: newList,
        sceneIndex,
      }
    }),
    handle(Actions.addControl, (scenes, { payload }) => {
      const newList = [...scenes.list],
        sceneIndex =
          'trackId' in payload.control
            ? scenes.list.findIndex(scene =>
                scene.trackIds.includes((payload.control as any).trackId)
              )
            : scenes.sceneIndex

      newList[sceneIndex] = {
        ...newList[sceneIndex],
        controls: {
          ...newList[sceneIndex].controls,
          [payload.controlId]: payload.control,
        },
      }
      return propogagteControlPositions(
        {
          ...scenes,
          list: newList,
        },
        sceneIndex
      )
    }),
    handle(Actions.removeControl, (scenes, { payload: controlId }) => {
      const newList = [...scenes.list],
        sceneIndex = scenes.list.findIndex(scene =>
          _.keys(scene.controls).includes(controlId)
        )

      newList[sceneIndex] = {
        ...newList[sceneIndex],
        controls: _.omit(newList[sceneIndex].controls, controlId),
      }
      return {
        ...scenes,
        list: newList,
      }
    }),
    handle(Actions.setControlPos, (scenes, { payload }) => {
      const newList = [...scenes.list],
        sceneIndex = scenes.list.findIndex(scene =>
          _.keys(scene.controls).includes(payload.controlId)
        ),
        controls = newList[sceneIndex].controls

      newList[sceneIndex] = {
        ...newList[sceneIndex],
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
          ...scenes,
          list: newList,
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
