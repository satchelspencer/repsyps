import { combineReducers } from 'redux'
import { createReducer } from 'deox'
import * as _ from 'lodash'

import * as Actions from './actions'
import * as Types from './types'

export default combineReducers({
  mix: createReducer({ frac: 0, length: 0, on: false } as Types.MixState, handle => [
    handle(Actions.togglePlayback, mixState => {
      return {
        ...mixState,
        on: !mixState.on,
      }
    }),
    handle(Actions.updateMixState, (mixState, { payload }) => {
      return {
        ...mixState,
        ...payload,
      }
    }),
    handle(Actions.updateTrackTime, (mixState, { payload }) => {
      return payload.frac
        ? {
            ...mixState,
            frac: payload.frac,
          }
        : mixState
    }),
  ]),
  tracks: createReducer({} as Types.TracksState, handle => [
    handle(Actions.editTrack, (tracks, { payload }) => {
      return {
        ...tracks,
        [payload.id]: {
          ...tracks[payload.id],
          editing: payload.edit,
        },
      }
    }),
    handle(Actions.selectTrackExclusive, (tracks, { payload: id }) => {
      return _.mapValues(tracks, (track, trackId) => {
        if (trackId === id) {
          return { ...track, selected: true }
        } else if (track.selected) {
          return { ...track, selected: false }
        } else return track
      })
    }),
    handle(Actions.setTrackBounds, (tracks, { payload }) => {
      return {
        ...tracks,
        [payload.id]: {
          ...tracks[payload.id],
          bounds: payload.bounds,
        },
      }
    }),
    handle(Actions.addTrack, (tracks, { payload }) => {
      if (tracks[payload.id]) return tracks
      else
        return {
          ...tracks,
          [payload.id]: {
            name: payload.name,
            buffer: payload.buffer,
            display: {
              scale: 100,
              start: 0,
            },
            playback: {
              on: false,
              start: 0,
              vol: 1,
            },
            nextPlayback: [],
            position: 0,
            bounds: [],
            selected: false,
            editing: true,
          },
        }
    }),
    handle(Actions.rmTrack, (tracks, { payload }) => _.omit(tracks, payload.id)),
    handle(Actions.updateTrackDisplay, (tracks, { payload }) => {
      return {
        ...tracks,
        [payload.id]: {
          ...tracks[payload.id],
          display: {
            ...tracks[payload.id].display,
            ...payload.display,
          },
        },
      }
    }),
    handle(Actions.updateTrackPlayback, (tracks, { payload }) => {
      return {
        ...tracks,
        [payload.id]: {
          ...tracks[payload.id],
          playback: {
            ...tracks[payload.id].playback,
            ...payload.playback,
          },
          nextPlayback: payload.nextPlayback || tracks[payload.id].nextPlayback,
          position: payload.playback.aperiodic ? 0 : tracks[payload.id].position,
        },
      }
    }),
    handle(Actions.applyNextPlayback, (tracks, { payload }) => {
      const nextNextPlayback = [...tracks[payload.id].nextPlayback],
        first = nextNextPlayback.shift()
      if (first) nextNextPlayback.push(first)

      return {
        ...tracks,
        [payload.id]: {
          ...tracks[payload.id],
          playback: {
            ...tracks[payload.id].playback,
            ...(first || {}),
          },
          nextPlayback: nextNextPlayback,
        },
      }
    }),
    handle(Actions.updateTrackTime, (tracks, { payload }) => {
      return _.mapValues(tracks, (track, trackId) => {
        const position = payload.trackPositions[trackId]
        return position !== undefined ? { ...track, position } : track
      })
    }),
  ]),
})
