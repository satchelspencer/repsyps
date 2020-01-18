import { combineReducers } from 'redux'
import { createReducer } from 'deox'
import * as _ from 'lodash'

import * as Actions from './actions'
import * as Types from 'lib/types'
import { RATE } from 'lib/audio'

const defaultPlayback: Types.Playback = {
    volume: 1,
    playing: true,
    period: 5.33 * RATE,
    time: 0,
  },
  defaultSources: Types.Sources = {},
  defaultTrack: Types.Track = {
    volume: 1,
    chunks: [0, 0],
    alpha: 1.2,
    playing: false,
    aperiodic: true,
    chunkIndex: -1,
    sample: 0,
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
          playback: defaultTrack,
          bounds: [],
          selected: false,
          editing: true,
        },
      }
    }),
    handle(Actions.rmSource, (sources, { payload }) => {
      return _.omit(sources, payload)
    }),
    handle(Actions.setSourcePlayback, (sources, { payload }) => {
      return {
        ...sources,
        [payload.sourceId]: {
          ...sources[payload.sourceId],
          playback: {
            ...sources[payload.sourceId].playback,
            ...payload.playback,
          },
        },
      }
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
    handle(Actions.toggleSource, (sources, { payload }) => {
      return {
        ...sources,
        [payload]: {
          ...sources[payload],
          playback: {
            ...sources[payload].playback,
            playing: !sources[payload].playback.playing,
          },
        },
      }
    }),
    handle(Actions.selectSourceExclusive, (sources, { payload }) => {
      return _.mapValues(sources, (source, sourceId) => {
        if (payload === sourceId) {
          return { ...source, selected: true }
        } else if (source.selected) {
          return { ...source, selected: false }
        } else return source
      })
    }),
    handle(Actions.editSource, (sources, { payload }) => {
      return {
        ...sources,
        [payload.sourceId]: {
          ...sources[payload.sourceId],
          editing: payload.edit,
        },
      }
    }),
    handle(Actions.updateTime, (sources, { payload }) => {
      return _.mapValues(sources, (source, sourceId) => {
        const isPlaying = source.playback.playing,
          trackTiming = payload[sourceId]

        let needsUpdate = false
        if (isPlaying) {
          for (let prop in trackTiming) {
            if (trackTiming[prop] !== source.playback[prop]) {
              needsUpdate = true
              break
            }
          }
        }
        return needsUpdate
          ? {
              ...source,
              playback: {
                ...source.playback,
                ...trackTiming,
              },
            }
          : source
      })
    }),
  ]),
})
