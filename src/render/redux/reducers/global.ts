import { createReducer } from 'deox'
import * as _ from 'lodash'
import pathUtils from 'path'

import * as Actions from '../actions'
import * as Types from 'render/util/types'
import * as Selectors from '../selectors'
import {
  defaultState,
  defaultTrack,
  defaultSource,
  defaultBinding,
  defaultSettings,
} from '../defaults'
import { updateSceneIndex } from './scenes'
import { getCuePlayback } from './cues'

export function updateSourcesPaths(
  sources: Types.Sources,
  lastPath: string | null,
  nextPath: string | null,
  force?: boolean
): Types.Sources {
  if (lastPath === nextPath && !force) return sources
  else
    return _.mapValues(sources, (source) => {
      return {
        ...source,
        sourceTracks: _.mapValues(source.sourceTracks, (sourceTrack) => {
          const lastBase = sourceTrack.base || lastPath,
            absSource =
              sourceTrack.source &&
              (pathUtils.isAbsolute(sourceTrack.source) || !lastBase
                ? sourceTrack.source
                : pathUtils.resolve(lastBase, sourceTrack.source))
          return {
            ...sourceTrack,
            source: nextPath ? pathUtils.relative(nextPath, absSource) : absSource,
            base: nextPath,
          }
        }),
      }
    })
}

export default createReducer(defaultState, (handle) => [
  handle(Actions.reset, (state) => {
    return {
      ...defaultState,
      live: {
        ...defaultState.live,
        bindings: state.live.bindings,
        globalControls: state.live.globalControls,
      },
      settings: state.settings,
      library: state.library,
      output: state.output,
    }
  }),
  handle(Actions.loadPersisted, (state, { payload }) => {
    const pLive = payload.state.live,
      firstScene = payload.state.live.scenes[0],
      firstTrackId = firstScene && firstScene.trackIds[0],
      newSources = _.mapValues(payload.state.sources, (psource, sourceId) => {
        const existingSource = state.sources[sourceId]
        return {
          ...defaultSource,
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
      }),
      savePath = state.save.path && pathUtils.dirname(state.save.path),
      newPathUpdatedSources = payload.reset
        ? updateSourcesPaths(newSources, savePath, savePath, true)
        : newSources

    return updateSceneIndex(
      {
        ...state,
        sources: newPathUpdatedSources,
        live: {
          ...state.live,
          ...pLive,
          scenes: pLive.scenes.map((pscene, i) => {
            const sscene = state.live.scenes[i]
            return {
              ...pscene,
              controlValues: (!payload.reset && sscene && sscene.controlValues) || {},
              initValues: (!payload.reset && sscene && sscene.initValues) || {},
            }
          }),
          bindings: {
            ...state.live.bindings,
            ..._.mapValues(
              _.pickBy(pLive.bindings, (b) => (b as any).note === undefined),
              (pbinding) => ({
                ...defaultBinding,
                ...pbinding,
              })
            ),
          },
          tracks: _.mapValues(pLive.tracks, (ptrack, trackId) => {
            const existingTrack = state.live.tracks[trackId],
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
              lastPeriod: ptrack.lastPeriod || 0,
            }
          }),
        },
        playback: payload.state.playback,
      },
      payload.reset ? 0 : state.live.sceneIndex,
      payload.reset
    )
  }),
  handle(Actions.loadLocalPersisted, (state, { payload: localPersisted }) => {
    return {
      ...state,
      save: localPersisted.save,
      settings: {
        ...defaultSettings,
        ...localPersisted.settings,
      },
      output: {
        ...state.output,
        ...localPersisted.output,
      },
      live: {
        ...state.live,
        ...localPersisted.live,
      },
    }
  }),
  handle(Actions.updateTime, (state, { payload }) => {
    let needsUpdate = false
    const newTracks = _.mapValues(state.live.tracks, (track, trackId) => {
      const trackTiming = payload.timing.tracks[trackId]
      if (!trackTiming) return track
      const didAdvanceChunk =
          track.playback.chunkIndex !== trackTiming.playback.chunkIndex ||
          track.playback.playing !== track.playback.playing,
        didAdvancePlayback = track.nextPlayback && !trackTiming.nextPlayback,
        source = Selectors.getSourceByTrackId(state, trackId)

      if (
        didAdvancePlayback &&
        payload.commit &&
        track.nextCueIndex !== -1 &&
        track.nextPlayback &&
        source
      ) {
        needsUpdate = true
        const appliedCue = source.cues[track.nextCueIndex],
          followingCue = source.cues[track.nextCueIndex + 1],
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
            chunkIndex: trackTiming.playback.chunkIndex ?? -1,
            playing: trackTiming.playback.playing ?? false,
          },
        }
      } else return track
    })

    return needsUpdate
      ? {
          ...state,
          live: {
            ...state.live,
            tracks: newTracks,
          },
        }
      : state
  }),
  handle(Actions.setSaveStatus, (state, { payload: saveStatus }) => {
    const lastPath = state.save.path ? pathUtils.dirname(state.save.path) : '',
      nextPath = saveStatus.path && pathUtils.dirname(saveStatus.path)

    return {
      ...state,
      save: {
        ...state.save,
        ...saveStatus,
      },
      sources: updateSourcesPaths(state.sources, lastPath, nextPath),
    }
  }),
  handle(Actions.setSettings, (state, { payload: newSettings }) => {
    return {
      ...state,
      settings: {
        ...state.settings,
        ...newSettings,
      },
    }
  }),
  handle(Actions.setRecording, (state, { payload: newRecording }) => {
    return {
      ...state,
      recording: {
        ...state.recording,
        ...newRecording,
      },
    }
  }),
  handle(Actions.updatePlayback, (state, { payload: newPlayback }) => {
    return {
      ...state,
      playback: {
        ...state.playback,
        ...newPlayback,
      },
    }
  }),
  handle(Actions.incrementPeriod, (state, { payload: diff }) => {
    return {
      ...state,
      playback: {
        ...state.playback,
        period: state.playback.period + diff,
      },
    }
  }),
  handle(Actions.setOutputs, (state, { payload: newOutputs }) => {
    return {
      ...state,
      output: {
        ...state.output,
        ...newOutputs,
      },
    }
  }),
  handle(Actions.setModalRoute, (state, { payload: route }) => {
    return {
      ...state,
      modalRoute: route,
    }
  }),
  handle(Actions.setLibraryState, (state, { payload: newState }) => {
    return {
      ...state,
      library: {
        ...state.library,
        ...newState,
      },
    }
  }),
  handle(Actions.addLibraryProjects, (state, { payload: newProjects }) => {
    return {
      ...state,
      library: {
        ...state.library,
        projects: {
          ...state.library.projects,
          ...newProjects,
        },
      },
    }
  }),
])
