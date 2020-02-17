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
    time: 0,
  },
  defaultTracks: Types.Tracks = {},
  defaultTrackPlayback: Types.TrackPlayback = {
    chunks: [0, 0],
    nextChunks: [],
    alpha: 1,
    playing: false,
    aperiodic: true,
    chunkIndex: -1,
    nextAtChunk: false,
    sample: 0,
    muted: false,
  },
  defaultControls: Types.Controls = {},
  defaultBindings: Types.Bindings = {}

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
        chunks: cue.chunks,
        nextAtChunk: false,
        chunkIndex: -1,
        nextChunks: hasFollowing ? followingCue.chunks : [],
        playing: true,
      },
    }
  } else if (cue.startBehavior === 'on-chunk' || cue.startBehavior === 'on-end') {
    return {
      ...track,
      nextCueIndex: cueIndex,
      playback: {
        ...track.playback,
        nextChunks: cue.chunks,
        nextAtChunk: cue.startBehavior === 'on-chunk',
      },
    }
  } else return track
}

export default combineReducers({
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
  controls: createReducer(defaultControls, handle => [
    handle(Actions.addControl, (controls, { payload }) => {
      return {
        ...controls,
        [payload.controlId]: payload.control,
      }
    }),
    handle(Actions.removeControl, (controls, { payload }) => {
      return _.omit(controls, payload)
    }),
    handle(Actions.rmTrack, (controls, { payload }) => {
      return _.pickBy(
        controls,
        control => !('trackId' in control && control.trackId === payload) //keep only controls that arent tied to a sourec
      )
    }),
    handle(Actions.setControlPos, (controls, { payload }) => {
      return {
        ...controls,
        [payload.controlId]: {
          ...controls[payload.controlId],
          position: {
            ...controls[payload.controlId].position,
            ...payload.position,
          },
        },
      }
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
    handle(Actions.updateTime, (playback, { payload }) => {
      return {
        ...playback,
        time: payload.timing.time,
      }
    }),
  ]),
  tracks: createReducer(defaultTracks, handle => [
    handle(Actions.setTrackMuted, (tracks, { payload }) => {
      return {
        ...tracks,
        [payload.trackId]: {
          ...tracks[payload.trackId],
          playback: {
            ...tracks[payload.trackId].playback,
            muted: payload.muted,
          },
        },
      }
    }),
    handle(Actions.setTrackSolo, (tracks, { payload }) => {
      return _.mapValues(tracks, (track, trackId) => {
        return {
          ...track,
          playback: {
            ...track.playback,
            muted: payload.solo ? payload.trackId !== trackId : false,
          },
        }
      })
    }),
    handle(Actions.reorderCue, (tracks, { payload }) => {
      const track = tracks[payload.trackId],
        newCues = arrayMove(track.cues, payload.oldIndex, payload.newIndex)
      return {
        ...tracks,
        [payload.trackId]: {
          ...track,
          cues: newCues,
        },
      }
    }),
    handle(Actions.addCue, (tracks, { payload }) => {
      const track = tracks[payload.trackId],
        newCues = [...track.cues]
      newCues[payload.index === undefined ? newCues.length : payload.index] = payload.cue
      return {
        ...tracks,
        [payload.trackId]: {
          ...track,
          cues: newCues,
        },
      }
    }),
    handle(Actions.deleteCue, (tracks, { payload }) => {
      const track = tracks[payload.trackId],
        newCues = [...track.cues]
      newCues.splice(payload.index, 1)
      return {
        ...tracks,
        [payload.trackId]: {
          ...track,
          cues: newCues,
        },
      }
    }),
    handle(Actions.applyControl, (tracks, { payload }) => {
      const control = payload.control
      if (!('trackId' in control) || !tracks[control.trackId]) return tracks
      else if ('trackChannelId' in control) {
        return {
          ...tracks,
          [control.trackId]: {
            ...tracks[control.trackId],
            trackChannels: {
              ...tracks[control.trackId].trackChannels,
              [control.trackChannelId]: {
                ...tracks[control.trackId].trackChannels[control.trackChannelId],
                [control.prop]: payload.value,
              },
            },
          },
        }
      } else if ('cueIndex' in control && payload.function === 'note-on') {
        return {
          ...tracks,
          [control.trackId]: applyCue(tracks[control.trackId], control.cueIndex),
        }
      } else if ('cueStep' in control) {
        const track = tracks[control.trackId],
          currentIndex = track.cueIndex,
          nextIndex = currentIndex + control.cueStep

        if (nextIndex >= 0 && nextIndex < track.cues.length) {
          return {
            ...tracks,
            [control.trackId]: applyCue(track, nextIndex),
          }
        } else
          return {
            ...tracks,
            [control.trackId]: {
              ...track,
              playback: {
                ...track.playback,
                playing: false,
                nextChunks: [],
              },
              cueIndex: -1,
            },
          }
      } else return tracks
    }),
    handle(Actions.addTrack, (tracks, { payload }) => {
      return {
        ...tracks,
        [payload.trackId]: {
          name: payload.name,
          playback: defaultTrackPlayback,
          trackChannels: payload.trackChannels,
          bounds: payload.bounds || [],
          selected: false,
          editing: true,
          cues: [],
          cueIndex: -1,
          nextCueIndex: -1,
        },
      }
    }),
    handle(Actions.setTrackChannels, (tracks, { payload }) => {
      return {
        ...tracks,
        [payload.trackId]: {
          ...tracks[payload.trackId],
          trackChannels: {
            ...tracks[payload.trackId].trackChannels,
            [payload.trackChannelId]: {
              ...tracks[payload.trackId].trackChannels[payload.trackChannelId],
              ...payload.trackChannel,
            },
          },
        },
      }
    }),
    handle(Actions.rmTrack, (tracks, { payload }) => {
      return _.omit(tracks, payload)
    }),
    handle(Actions.setTrackPlayback, (tracks, { payload }) => {
      if (!!payload.playback.chunks)
        return {
          ...tracks,
          [payload.trackId]: {
            ...tracks[payload.trackId],
            playback: {
              ...tracks[payload.trackId].playback,
              ...payload.playback,
              nextChunks: [],
              nextAtChunk: false,
            },
            cueIndex: -1,
            nextCueIndex: -1,
          },
        }
      else
        return {
          ...tracks,
          [payload.trackId]: {
            ...tracks[payload.trackId],
            playback: {
              ...tracks[payload.trackId].playback,
              ...payload.playback,
            },
          },
        }
    }),
    handle(Actions.setTrackBounds, (tracks, { payload }) => {
      return {
        ...tracks,
        [payload.trackId]: {
          ...tracks[payload.trackId],
          bounds: payload.bounds,
        },
      }
    }),
    handle(Actions.toggleTrack, (tracks, { payload }) => {
      return {
        ...tracks,
        [payload]: {
          ...tracks[payload],
          playback: {
            ...tracks[payload].playback,
            playing: !tracks[payload].playback.playing,
          },
        },
      }
    }),
    handle(Actions.selectTrackExclusive, (tracks, { payload }) => {
      return _.mapValues(tracks, (track, trackId) => {
        if (payload === trackId) {
          return { ...track, selected: true }
        } else if (track.selected) {
          return { ...track, selected: false }
        } else return track
      })
    }),
    handle(Actions.editTrack, (tracks, { payload }) => {
      return {
        ...tracks,
        [payload.trackId]: {
          ...tracks[payload.trackId],
          editing: payload.edit,
        },
      }
    }),
    handle(Actions.updateTime, (tracks, { payload }) => {
      return _.mapValues(tracks, (track, trackId) => {
        const trackTiming = payload.timing.tracks[trackId],
          isPlaying = trackTiming.playing,
          chunksChanged = !isEqual(track.playback.chunks, trackTiming.chunks)

        if (chunksChanged && payload.commit && track.nextCueIndex !== -1) {
          const appliedCue = track.cues[track.nextCueIndex],
            followingCue = track.cues[track.nextCueIndex + 1],
            hasFollowing = appliedCue.endBehavior === 'next' && followingCue
          return {
            ...track,
            cueIndex: track.nextCueIndex,
            nextCueIndex: hasFollowing ? track.nextCueIndex + 1 : -1,
            playback: {
              ...track.playback,
              ...trackTiming,
              nextAtChunk: false, //wait till end to apply nextChunks
              nextChunks: hasFollowing ? followingCue.chunks : [],
            },
          }
        } else if (isPlaying) {
          return {
            ...track,
            playback: {
              ...track.playback,
              ...trackTiming,
            },
          }
        } else return track
      })
    }),
    handle(Actions.copyTrackBounds, (tracks, { payload }) => {
      const from = tracks[payload.src],
        to = tracks[payload.dest]

      if (from && to)
        return {
          ...tracks,
          [payload.dest]: {
            ...to,
            bounds: [...from.bounds],
          },
        }
      else return tracks
    }),
  ]),
})
