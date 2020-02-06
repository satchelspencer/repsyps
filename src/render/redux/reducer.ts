import { combineReducers } from 'redux'
import { createReducer } from 'deox'
import * as _ from 'lodash'

import * as Actions from './actions'
import * as Types from 'render/util/types'
import { RATE } from 'render/util/audio'

const defaultPlayback: Types.Playback = {
    volume: 1,
    playing: true,
    period: 2.7 * RATE,
    time: 0,
  },
  defaultTracks: Types.Tracks = {},
  defaultTrackPlayback: Types.TrackPlayback = {
    chunks: [0, 0],
    alpha: 1,
    playing: false,
    aperiodic: true,
    chunkIndex: -1,
    sample: 0,
  },
  defaultControls: Types.Controls = {},
  defaultBindings: Types.Bindings = {}

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
        time: (payload as any).playback,
      }
    }),
  ]),
  tracks: createReducer(defaultTracks, handle => [
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
      if (!('trackId' in control)) return tracks
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
          [control.trackId]: {
            ...tracks[control.trackId],
            playback: {
              ...tracks[control.trackId].playback,
              ...tracks[control.trackId].cues[control.cueIndex],
            },
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
        const isPlaying = track.playback.playing,
          trackTiming = payload[trackId]

        let needsUpdate = false
        if (isPlaying) {
          for (let prop in trackTiming) {
            if (trackTiming[prop] !== track.playback[prop]) {
              needsUpdate = true
              break
            }
          }
        }
        return needsUpdate
          ? {
              ...track,
              playback: {
                ...track.playback,
                ...trackTiming,
              },
            }
          : track
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
