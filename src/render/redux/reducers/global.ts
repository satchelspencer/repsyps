import { createReducer } from 'deox'
import * as _ from 'lodash'
import pathUtils from 'path'

import * as Actions from '../actions'
import { defaultState, defaultTrack, defaultSource } from '../defaults'
import { updateSceneIndex } from './scenes'
import { getCuePlayback } from './cues'

export default createReducer(defaultState, (handle) => [
  handle(Actions.reset, () => defaultState),
  handle(Actions.loadPersisted, (state, { payload }) => {
    const pLive = payload.state.live,
      firstScene = payload.state.live.scenes[0],
      firstTrackId = firstScene && firstScene.trackIds[0]

    return updateSceneIndex(
      {
        ...state,
        sources: _.mapValues(payload.state.sources, (psource, sourceId) => {
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
        live: {
          ...state.live,
          ...pLive,
          bindings: {
            ...state.live.bindings,
            ...pLive.bindings,
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
      pLive.sceneIndex || 0,
      payload.reset
    )
  }),
  handle(Actions.loadLocalPersisted, (state, { payload: localPersisted }) => {
    return {
      ...state,
      save: localPersisted.save,
      settings: localPersisted.settings,
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

    return {
      ...state,
      timing: {
        time: payload.timing.time,
        tracks: {
          ...state.timing.tracks,
          ..._.mapValues(payload.timing.tracks, (t) => t.sample),
        },
        recTime: payload.timing.recTime,
      },
      live: needsUpdate
        ? {
            ...state.live,
            tracks: newTracks,
          }
        : state.live,
    }
  }),
  handle(Actions.setSaveStatus, (state, { payload: saveStatus }) => {
    const lastPath = state.save.path ? pathUtils.dirname(state.save.path) : '',
      nextPath = pathUtils.dirname(saveStatus.path)
    let newSources = state.sources
    if (lastPath !== nextPath) {
      newSources = _.mapValues(state.sources, (source) => {
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
      })
    }

    return {
      ...state,
      save: saveStatus,
      sources: newSources,
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
  handle(Actions.updatePlaybackTime, (state, { payload: time }) => {
    return {
      ...state,
      timing: {
        ...state.timing,
        time: state.timing.time + time,
      },
    }
  }),
  handle(Actions.resetPlaybackTime, (state) => {
    return {
      ...state,
      timing: {
        ...state.timing,
        time: 0,
      },
    }
  }),
])
