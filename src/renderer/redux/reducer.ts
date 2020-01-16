import { combineReducers } from 'redux'
import { createReducer } from 'deox'
import * as _ from 'lodash'

import * as Actions from './actions'
import * as Types from 'lib/types'

const defaultPlayback: Types.Playback = {
    volume: 1,
    playing: false,
    period: 5.33,
    time: 0,
  },
  defaultSources: Types.Sources = {},
  defaultTrack: Types.Track = {
    sourceId: null,
    volume: 1,
    chunks: [],
    chunkIndex: -1,
    alpha: 1,
  }

export default combineReducers({
  playback: createReducer(defaultPlayback, handle => [
    handle(Actions.updatePlayback, (playback, { payload }) => {
      return {
        ...playback,
        ...payload,
      }
    }),
  ]),
  sources: createReducer(defaultSources, handle => [
    handle(Actions.addSource, (sources, { payload }) => {
      return {
        ...sources,
        [payload.sourceId]: {
          name: payload.name,
          channels: payload.channels,
          playback: {
            ...defaultTrack,
            sourceId: payload.sourceId,
          },
          bounds: [],
        },
      }
    }),
  ]),
})
