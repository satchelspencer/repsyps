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
      return {
        ...mixState,
        frac: payload.frac,
      }
    }),
  ]),
  tracks: createReducer({} as Types.TracksState, handle => [
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
            nextPlayback: null,
            position: 0,
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
      if (payload.immediate)
        return {
          ...tracks,
          [payload.id]: {
            ...tracks[payload.id],
            playback: {
              ...tracks[payload.id].playback,
              ...payload.playback,
            },
            position: 0,
            nextPlayback: payload.resetNext ? null : tracks[payload.id].nextPlayback,
          },
        }
      else
        return {
          ...tracks,
          [payload.id]: {
            ...tracks[payload.id],
            nextPlayback: {
              ...payload.playback,
            },
          },
        }
    }),
    handle(Actions.applyNextPlayback, (tracks, { payload }) => {
      return {
        ...tracks,
        [payload.id]: {
          ...tracks[payload.id],
          playback: {
            ...tracks[payload.id].playback,
            ...(tracks[payload.id].nextPlayback || {}),
          },
          nextPlayback: null,
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
