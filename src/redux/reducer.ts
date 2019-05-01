import { combineReducers } from 'redux'
import { createReducer } from 'deox'
import * as _ from 'lodash'

import * as Actions from './actions'
import * as Types from './types'

export default combineReducers({
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
              paused: true,
              start: 0,
              length: 44100 * 10,
              alpha: 1,
              position: 0,
            },
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
        },
      }
    }),
  ]),
})
