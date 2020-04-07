import { combineReducers } from 'redux'
import { createReducer } from 'deox'
import { enableBatching } from 'redux-batched-actions'
import * as _ from 'lodash'
import arrayMove from 'array-move'
import reduceReducers from 'reduce-reducers'
import pathUtils from 'path'

import * as Types from 'render/util/types'
import * as Actions from './actions'
import * as Selectors from './selectors'
import { RATE } from 'render/util/audio'

export const defaultPlayback: Types.Playback = {
    volume: 1,
    playing: true,
    period: 2.7 * RATE,
  },
  defaultTrackPlayback: Types.TrackPlayback = {
    chunks: [0, 0],
    alpha: 1,
    volume: 1,
    loop: true,
    playing: false,
    aperiodic: true,
    filter: 0.5,
    chunkIndex: -1,
    nextAtChunk: false,
    muted: false,
    sourceTracksParams: {},
    unpause: false,
  },
  defaultTrack: Types.Track = {
    visibleSourceTrack: null,
    playback: defaultTrackPlayback,
    nextPlayback: null,
    selected: false,
    editing: true,
    sourceTrackEditing: null,
    cues: [],
    cueIndex: -1,
    nextCueIndex: -1,
    playLock: false,
  },
  defaultBindings: Types.Bindings = {},
  defaultBinding: Types.Binding = {
    type: 'value',
    channel: null,
    note: null,
    function: null,
    twoway: true,
  },
  defaultScene: Types.Scene = {
    controls: {},
    trackIds: [],
  },
  defaultLive: Types.Live = {
    sceneIndex: 0,
    scenes: [defaultScene],
    tracks: {},
    controlValues: {},
    initValues: {},
    bindings: defaultBindings,
    controlPresets: {},
    defaultPresetId: null,
    controlsEnabled: true,
  },
  defaultSources: Types.Sources = {},
  defaultTiming: Types.Times = {
    time: 0,
    tracks: {},
    recTime: 0,
  },
  defaultTrackSourceParams: Types.TrackSourceParams = { volume: 0, offset: 0 },
  defaultControlGroup: Types.ControlGroup = {
    absolute: true,
    position: { x: 0, y: 0 },
    bindingType: 'value',
    controls: [],
  },
  defaultSave: Types.SaveStatus = {
    saved: false,
    path: null,
  },
  defaultSettings: Types.Settings = {
    trackScroll: true,
  },
  defaultRecording: Types.Recording = {
    enabled: false,
    fromTrack: null,
  },
  defaultState: Types.State = {
    save: defaultSave,
    timing: defaultTiming,
    playback: defaultPlayback,
    live: defaultLive,
    sources: defaultSources,
    settings: defaultSettings,
    recording: defaultRecording,
  }

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
          offset: 0,
        }
      else return srcConfig
    }
  )
}

function getCuePlayback(
  cue: Types.Cue,
  playback: Types.TrackPlayback
): Types.TrackPlayback {
  return {
    ...playback,
    ..._.pick(cue.playback, cue.used),
    unpause: false,
    loop: cue.endBehavior !== 'stop',
    sourceTracksParams: cue.used.includes('sourceTracksParams')
      ? mergeTrackSourcesParams(
          playback.sourceTracksParams,
          cue.playback.sourceTracksParams
        )
      : playback.sourceTracksParams,
  }
}

function applyCue(track: Types.Track, cueIndex: number): Types.Track {
  const cue = track.cues[cueIndex]
  if (!cue) return track
  const followingCue = track.cues[cueIndex + 1]

  if (cue.startBehavior === 'immediate') {
    const hasFollowing = cue.endBehavior === 'next' && followingCue
    return {
      ...track,
      cueIndex: cueIndex,
      nextCueIndex: hasFollowing ? cueIndex + 1 : -1,
      playback: getCuePlayback(cue, track.playback),
      nextPlayback: hasFollowing ? getCuePlayback(followingCue, track.playback) : null,
    }
  } else if (cue.startBehavior === 'on-chunk' || cue.startBehavior === 'on-end') {
    return {
      ...track,
      nextCueIndex: cueIndex,
      playback: {
        ...track.playback,
        nextAtChunk: cue.startBehavior === 'on-chunk',
        unpause: true,
      },
      nextPlayback: getCuePlayback(cue, track.playback),
    }
  } else return track
}

function updateSceneIndex(
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

const reducer = combineReducers({
  timing: createReducer(defaultTiming, (handle) => [
    handle(Actions.reset, () => defaultTiming),
    handle(Actions.updateTime, (timing, { payload }) => {
      return {
        time: payload.timing.time,
        tracks: {
          ...timing.tracks,
          ..._.mapValues(payload.timing.tracks, (t) => t.sample),
        },
        recTime: payload.timing.recTime,
      }
    }),
    handle(Actions.updatePlaybackTime, (timing, { payload: time }) => {
      return {
        ...timing,
        time: timing.time + time,
      }
    }),
    handle(Actions.resetPlaybackTime, (timing) => {
      return {
        ...timing,
        time: 0,
      }
    }),
    handle(Actions.zeroInitValues, () => defaultTiming),
  ]),
  sources: createReducer(defaultSources, (handle) => [
    handle(Actions.reset, () => defaultSources),
    handle(Actions.loadPersisted, (sources, { payload }) => {
      return _.mapValues(payload.state.sources, (psource, sourceId) => {
        const existingSource = sources[sourceId]
        return {
          ...psource,
          sourceTracks: _.mapValues(
            psource.sourceTracks,
            (psourceTrack, sourceTrackId) => {
              const existingSourceTrack =
                existingSource && existingSource.sourceTracks[sourceTrackId]
              return {
                ...psourceTrack,
                loaded:
                  payload.reset || !existingSourceTrack
                    ? false
                    : existingSourceTrack.loaded,
                missing:
                  payload.reset || !existingSourceTrack
                    ? false
                    : existingSourceTrack.missing,
              }
            }
          ),
        }
      })
    }),
    handle(Actions.didLoadTrackSource, (sources, { payload }) => {
      return {
        ...sources,
        [payload.sourceId]: {
          ...sources[payload.sourceId],
          sourceTracks: {
            ...sources[payload.sourceId].sourceTracks,
            [payload.sourceTrackId]: {
              ...sources[payload.sourceId].sourceTracks[payload.sourceTrackId],
              loaded: payload.loaded,
              missing:
                payload.missing === undefined
                  ? sources[payload.sourceId].sourceTracks[payload.sourceTrackId].missing
                  : payload.missing,
            },
          },
        },
      }
    }),
    handle(Actions.removeTrackSource, (sources, { payload }) => {
      return {
        ...sources,
        [payload.sourceId]: {
          ...sources[payload.sourceId],
          sourceTracks: _.omit(
            sources[payload.sourceId].sourceTracks,
            payload.sourceTrackId
          ),
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
  live: createReducer(defaultLive, (handle) => [
    handle(Actions.reset, () => defaultLive),
    handle(Actions.loadPersisted, (live, { payload }) => {
      const pLive = payload.state.live,
        firstScene = payload.state.live.scenes[0],
        firstTrackId = firstScene && firstScene.trackIds[0]
      return updateSceneIndex(
        {
          ...live,
          ...pLive,
          bindings: {
            ...live.bindings,
            ...pLive.bindings,
          },
          tracks: _.mapValues(pLive.tracks, (ptrack, trackId) => {
            const existingTrack = live.tracks[trackId],
              shouldReset = payload.reset || !existingTrack,
              base = shouldReset ? defaultTrack : existingTrack
            return {
              ...base,
              ...ptrack,
              playback: {
                ...base.playback,
                ...ptrack.playback,
              },
              selected: shouldReset ? trackId === firstTrackId : existingTrack.selected,
            }
          }),
        },
        pLive.sceneIndex || 0,
        payload.reset
      )
    }),
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
    handle(Actions.setControlGroup, (live, { payload }) => {
      const posStr = Selectors.pos2str(payload.position)
      return {
        ...live,
        controlValues: {
          ...live.controlValues,
          [posStr]: payload.controlGroup.absolute ? live.controlValues[posStr] : 1,
        },
        scenes: live.scenes.map((scene, sceneIndex) => {
          if (sceneIndex !== live.sceneIndex) return scene
          else {
            const newControlGroup = {
              ...(scene.controls[posStr] || defaultControlGroup),
              ...payload.controlGroup,
            }
            return {
              ...scene,
              controls: {
                ...scene.controls,
                [posStr]: newControlGroup,
              },
            }
          }
        }),
      }
    }),
    handle(Actions.deleteControlGroup, (live, { payload }) => {
      return {
        ...live,
        scenes: live.scenes.map((scene, sceneIndex) => {
          if (sceneIndex !== live.sceneIndex) return scene
          else
            return {
              ...scene,
              controls: _.omit(scene.controls, Selectors.pos2str(payload.position)),
            }
        }),
      }
    }),
    handle(Actions.setControlGroupValue, (live, { payload }) => {
      return {
        ...live,
        controlValues: {
          ...live.controlValues,
          [Selectors.pos2str(payload.position)]: payload.value,
        },
      }
    }),
    handle(Actions.moveControlGroup, (live, { payload }) => {
      return {
        ...live,
        scenes: live.scenes.map((scene, sceneIndex) => {
          if (sceneIndex !== live.sceneIndex) return scene
          else {
            const srcStr = Selectors.pos2str(payload.src),
              destStr = Selectors.pos2str(payload.dest)
            return {
              ...scene,
              controls: _.pickBy(
                {
                  ...scene.controls,
                  [srcStr]: scene.controls[destStr],
                  [destStr]: scene.controls[srcStr],
                },
                (a) => a
              ),
            }
          }
        }),
      }
    }),
    handle(Actions.clearControls, (live) => {
      return {
        ...live,
        scenes: live.scenes.map((scene, sceneIndex) => {
          if (sceneIndex !== live.sceneIndex) return scene
          else {
            return {
              ...scene,
              controls: {},
            }
          }
        }),
      }
    }),
    handle(Actions.setVisibleSourceTrack, (live, { payload }) => {
      return {
        ...live,
        tracks: {
          ...live.tracks,
          [payload.trackId]: {
            ...live.tracks[payload.trackId],
            visibleSourceTrack: payload.visibleSourceTrack,
          },
        },
      }
    }),
    handle(Actions.setTrackSourceParams, (live, { payload }) => {
      const trackId =
          payload.trackId || Selectors.getTrackIdByIndex(live, payload.trackIndex),
        sourceTrackId =
          payload.sourceTrackId ||
          (trackId &&
            _.keys(live.tracks[trackId].playback.sourceTracksParams)[
              payload.sourceTrackIndex
            ])
      if (!trackId || !sourceTrackId) return live
      return trackId
        ? {
            ...live,
            tracks: {
              ...live.tracks,
              [trackId]: {
                ...live.tracks[trackId],
                playback: {
                  ...live.tracks[trackId].playback,
                  sourceTracksParams: {
                    ...live.tracks[trackId].playback.sourceTracksParams,
                    [sourceTrackId]: {
                      ...live.tracks[trackId].playback.sourceTracksParams[sourceTrackId],
                      ...payload.sourceTrackParams,
                    },
                  },
                },
              },
            },
          }
        : live
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
    handle(Actions.removeTrackSource, (live, { payload }) => {
      const newSourceTracksParams = _.omit(
          live.tracks[payload.sourceId].playback.sourceTracksParams,
          payload.sourceTrackId
        ),
        currentVisible = live.tracks[payload.sourceId].visibleSourceTrack,
        currentEditing = live.tracks[payload.sourceId].sourceTrackEditing

      return {
        ...live,
        tracks: {
          ...live.tracks,
          [payload.sourceId]: {
            ...live.tracks[payload.sourceId],
            cues: live.tracks[payload.sourceId].cues.map((cue) => {
              if (cue.playback.sourceTracksParams[payload.sourceTrackId]) {
                return {
                  ...cue,
                  playback: {
                    ...cue.playback,
                    sourceTracksParams: _.omit(
                      cue.playback.sourceTracksParams,
                      payload.sourceTrackId
                    ),
                  },
                }
              } else return cue
            }),
            sourceTrackEditing:
              currentEditing === payload.sourceTrackId ? null : currentEditing,
            visibleSourceTrack:
              payload.sourceTrackId === currentVisible
                ? _.keys(newSourceTracksParams)[0]
                : currentVisible,
            playback: {
              ...live.tracks[payload.sourceId].playback,
              sourceTracksParams: newSourceTracksParams,
            },
          },
        },
      }
    }),
    handle(Actions.setTrackPlayback, (live, { payload }) => {
      const trackId =
        payload.trackId || Selectors.getTrackIdByIndex(live, payload.trackIndex)
      if (!trackId) return live
      else if (!!payload.playback.chunks || !payload.playback.playing)
        return {
          ...live,
          tracks: {
            ...live.tracks,
            [trackId]: {
              ...live.tracks[trackId],
              playback: {
                ...live.tracks[trackId].playback,
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
      else
        return {
          ...live,
          tracks: {
            ...live.tracks,
            [trackId]: {
              ...live.tracks[trackId],
              playback: {
                ...live.tracks[trackId].playback,
                ...payload.playback,
                unpause: false,
              },
            },
          },
        }
    }),
    handle(Actions.setTrackPlayLock, (live, { payload }) => {
      return {
        ...live,
        tracks: {
          ...live.tracks,
          [payload.trackId]: {
            ...live.tracks[payload.trackId],
            playLock: payload.playlock,
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
    handle(Actions.editSourceTrack, (live, { payload }) => {
      return {
        ...live,
        tracks: {
          ...live.tracks,
          [payload.trackId]: {
            ...live.tracks[payload.trackId],
            sourceTrackEditing: payload.sourceTrackEditing,
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
            track.playback.chunkIndex !== trackTiming.playback.chunkIndex ||
            track.playback.playing !== track.playback.playing,
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
            playback: track.nextPlayback,
            nextPlayback: hasFollowing
              ? getCuePlayback(followingCue, track.playback)
              : null,
          }
        } else if (didAdvanceChunk) {
          needsUpdate = true
          return {
            ...track,
            playback: {
              ...track.playback,
              chunkIndex: trackTiming.playback.chunkIndex,
              playing: trackTiming.playback.playing,
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
    handle(Actions.selectTrackExclusive, (live, { payload: trackId }) => {
      const containingIndex = live.scenes.findIndex((scene) =>
          scene.trackIds.includes(trackId)
        ),
        inScene = containingIndex !== -1,
        isLastOfScene =
          inScene &&
          live.scenes[containingIndex].trackIds.indexOf(trackId) ===
            live.scenes[containingIndex].trackIds.length - 1,
        shouldNotJump =
          (isLastOfScene && live.sceneIndex === containingIndex + 1) || !inScene,
        newSceneIndex = shouldNotJump ? live.sceneIndex : containingIndex

      return updateSceneIndex(
        {
          ...live,
          tracks: _.mapValues(live.tracks, (track, thisTrackId) => {
            if (thisTrackId === trackId) {
              return { ...track, selected: true }
            } else if (track.selected) {
              return { ...track, selected: false }
            } else return track
          }),
        },
        newSceneIndex
      )
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
        // add track to this scene
        newScenes[payload.toSceneIndex] = {
          ...currentScene,
          trackIds: arrayMove(
            [payload.trackId, ...currentScene.trackIds],
            0,
            insertIndex
          ),
        }
        // remove from old scene
        newScenes[payload.fromSceneIndex] = {
          ...newScenes[payload.fromSceneIndex],
          trackIds: newScenes[payload.fromSceneIndex].trackIds.filter(
            (id) => id !== payload.trackId
          ),
        }

        return {
          ...live,
          scenes: newScenes,
          tracks: newTracks,
        }
      }
    }),
    handle(Actions.createScene, (live, { payload: sceneIndex }) => {
      const newScenes = [...live.scenes],
        newScene = { ...defaultScene }

      if (live.defaultPresetId)
        newScene.controls = {
          ...live.controlPresets[live.defaultPresetId].controls,
        }

      newScenes.splice(sceneIndex, 0, newScene)
      return updateSceneIndex(
        {
          ...live,
          scenes: newScenes,
        },
        sceneIndex
      )
    }),
    handle(Actions.setSceneIndex, (live, { payload: sceneIndex }) => {
      return updateSceneIndex(live, sceneIndex)
    }),
    handle(Actions.stepTrackCue, (live, { payload }) => {
      const trackId =
        payload.trackId || Selectors.getTrackIdByIndex(live, payload.trackIndex)
      if (!trackId) return live

      const track = live.tracks[trackId],
        currentIndex = track.cueIndex,
        nextIndex = currentIndex + payload.cueStep

      if (!track.playback.playing && track.cueIndex !== -1) {
        return {
          ...live,
          tracks: {
            ...live.tracks,
            [trackId]: {
              ...track,
              playback: {
                ...track.playback,
                playing: true,
              },
            },
          },
        }
      } else if (nextIndex >= 0 && nextIndex < track.cues.length) {
        return {
          ...live,
          tracks: {
            ...live.tracks,
            [trackId]: applyCue(track, nextIndex),
          },
        }
      } else
        return {
          ...live,
          tracks: {
            ...live.tracks,
            [trackId]: {
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
    }),
    handle(Actions.setTrackCue, (live, { payload }) => {
      const trackId =
        payload.trackId || Selectors.getTrackIdByIndex(live, payload.trackIndex)
      if (!trackId) return live
      return {
        ...live,
        tracks: {
          ...live.tracks,
          [trackId]: applyCue(live.tracks[trackId], payload.cueIndex),
        },
      }
    }),
    handle(Actions.setBinding, (live, { payload }) => {
      const posStr = Selectors.pos2str(payload.position)
      return {
        ...live,
        bindings: {
          ...live.bindings,
          [posStr]: {
            ...defaultBinding,
            ...live.bindings[posStr],
            ...payload.binding,
          },
        },
      }
    }),
    handle(Actions.removeBinding, (live, { payload }) => {
      return {
        ...live,
        bindings: _.omit(live.bindings, Selectors.pos2str(payload)),
      }
    }),
    handle(Actions.setInitValue, (live, { payload }) => {
      return {
        ...live,
        initValues: {
          ...live.initValues,
          [Selectors.pos2str(payload.position)]: payload.value,
        },
      }
    }),
    handle(Actions.zeroInitValues, (live) => {
      return updateSceneIndex(live, live.sceneIndex, true)
    }),
    handle(Actions.addControlPreset, (live, { payload }) => {
      return {
        ...live,
        controlPresets: {
          ...live.controlPresets,
          [payload.presetId]: {
            name: payload.name,
            controls: { ...live.scenes[live.sceneIndex].controls },
          },
        },
      }
    }),
    handle(Actions.deleteControlPreset, (live, { payload: presetId }) => {
      return {
        ...live,
        controlPresets: _.omit(live.controlPresets, presetId),
        defaultPresetId: live.defaultPresetId === presetId ? null : live.defaultPresetId,
      }
    }),
    handle(Actions.setDefaultControlPreset, (live, { payload: presetId }) => {
      return {
        ...live,
        defaultPresetId: presetId,
      }
    }),
    handle(Actions.applyControlPreset, (live, { payload: presetId }) => {
      const preset = live.controlPresets[presetId]
      if (!preset) return live
      else
        return {
          ...live,
          scenes: live.scenes.map((scene, sceneIndex) => {
            if (sceneIndex === live.sceneIndex) {
              return {
                ...scene,
                controls: {
                  ...scene.controls,
                  ...preset.controls, //MERGING CONTROLS?
                },
              }
            } else return scene
          }),
        }
    }),
    handle(Actions.loadBindings, (live, { payload: bindingsFile }) => {
      return {
        ...live,
        ...bindingsFile,
      }
    }),
    handle(Actions.setControlsEnabled, (live, { payload: enabled }) => {
      return {
        ...live,
        controlsEnabled: enabled,
      }
    }),
  ]),
  playback: createReducer(defaultPlayback, (handle) => [
    handle(Actions.reset, () => defaultPlayback),
    handle(Actions.loadPersisted, (_, { payload }) => {
      return payload.state.playback
    }),
    handle(Actions.updatePlayback, (playback, { payload }) => {
      return {
        ...playback,
        ...payload,
      }
    }),
    handle(Actions.zeroInitValues, (playback) => {
      return {
        ...playback,
        playing: false,
      }
    }),
    /* playing and pausing on playback */
    handle(Actions.setTrackPlayback, (playback) => {
      return {
        ...playback,
        playing: true,
      }
    }),
    handle(Actions.setTrackCue, (playback) => {
      return {
        ...playback,
        playing: true,
      }
    }),
    handle(Actions.stepTrackCue, (playback) => {
      return {
        ...playback,
        playing: true,
      }
    }),
  ]),
  save: createReducer(defaultSave, (handle) => [
    handle(Actions.reset, () => defaultSave),
    handle(Actions.setSaveStatus, (_, { payload: saveStatus }) => saveStatus),
    handle(
      Actions.loadLocalPersisted,
      (_, { payload: localPersisted }) => localPersisted.save
    ),
  ]),
  settings: createReducer(defaultSettings, (handle) => [
    handle(Actions.reset, () => defaultSettings),
    handle(Actions.setSettings, (settings, { payload: newSettings }) => {
      return {
        ...settings,
        ...newSettings,
      }
    }),
    handle(
      Actions.loadLocalPersisted,
      (_, { payload: localPersisted }) => localPersisted.settings
    ),
  ]),
  recording: createReducer(defaultRecording, (handle) => [
    handle(Actions.reset, () => defaultRecording),
    handle(Actions.setRecording, (recording, { payload: newRecording }) => {
      return {
        ...recording,
        ...newRecording,
      }
    }),
  ]),
})

function makeSourceTracksRelative(source: Types.Source, path: string): Types.Source {
  return {
    ...source,
    sourceTracks: _.mapValues(source.sourceTracks, (sourceTrack) => {
      if (sourceTrack.source && pathUtils.isAbsolute(sourceTrack.source) && path)
        return {
          ...sourceTrack,
          source: pathUtils.relative(path, sourceTrack.source),
        }
      else return sourceTrack
    }),
  }
}

/* called FIRST */
const globalReducer = createReducer(defaultState, (handle) => [
  handle(Actions.setSaveStatus, (state, { payload: saveStatus }) => {
    const lastPath = state.save.path,
      nextPath = saveStatus.path
    if (lastPath === nextPath) return state
    else {
      return {
        ...state,
        sources: _.mapValues(state.sources, (source) => {
          return {
            ...source,
            sourceTracks: _.mapValues(source.sourceTracks, (sourceTrack) => {
              const absSource =
                sourceTrack.source &&
                (pathUtils.isAbsolute(sourceTrack.source)
                  ? sourceTrack.source
                  : pathUtils.resolve(lastPath, sourceTrack.source))
              return {
                ...sourceTrack,
                source: nextPath ? pathUtils.relative(nextPath, absSource) : absSource,
              }
            }),
          }
        }),
      }
    }
  }),
  handle(Actions.createSource, (state, { payload }) => {
    return {
      ...state,
      sources: {
        ...state.sources,
        [payload.sourceId]: makeSourceTracksRelative(payload.source, state.save.path),
      },
    }
  }),
  handle(Actions.createTrackSource, (state, { payload }) => {
    return {
      ...state,
      sources: {
        ...state.sources,
        [payload.sourceId]: makeSourceTracksRelative(
          {
            ...state.sources[payload.sourceId],
            sourceTracks: {
              ...state.sources[payload.sourceId].sourceTracks,
              [payload.sourceTrackId]: payload.sourceTrack,
            },
          },
          state.save.path
        ),
      },
    }
  }),
  handle(Actions.relinkTrackSource, (state, { payload }) => {
    return {
      ...state,
      sources: {
        ...state.sources,
        [payload.sourceId]: makeSourceTracksRelative(
          {
            ...state.sources[payload.sourceId],
            sourceTracks: {
              ...state.sources[payload.sourceId].sourceTracks,
              [payload.sourceTrackId]: {
                ...state.sources[payload.sourceId].sourceTracks[payload.sourceTrackId],
                source: payload.newSource,
                loaded: false,
                missing: false,
              },
            },
          },
          state.save.path
        ),
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

    return {
      ...state,
      sources: _.omit(state.sources, trackId),
      live: updateSceneIndex(
        {
          ...state.live,
          scenes: newScenes,
          tracks: _.omit(state.live.tracks, trackId),
        },
        newSceneIndex
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

export default enableBatching(reduceReducers(globalReducer, reducer))
