import { combineReducers } from 'redux'
import { createReducer } from 'deox'
import * as _ from 'lodash'

import * as Actions from './actions'
import * as Types from 'lib/types'
import { RATE } from 'lib/audio'

const defaultPlayback: Types.Playback = {
    volume: 0.666,
    playing: true,
    period: 2.7 * RATE,
    time: 0,
  },
  defaultSources: Types.Sources = {},
  defaultTrackPlayback: Types.TrackPlayback = {
    chunks: [0, 0],
    alpha: 1,
    playing: false,
    aperiodic: true,
    chunkIndex: -1,
    sample: 0,
  },
  defaultControls: Types.Controls = {
    values: [],
    cues: [],
  },
  defaultBindings: Types.Bindings = {
    values: [],
    cues: [],
  }

export default combineReducers({
  bindings: createReducer(defaultBindings, handle => [
    handle(Actions.setValueBinding, (bindings, { payload }) => {
      const newBindings = [...bindings.values].map(v =>
        v.waiting ? _.omit(v, 'waiting') : v
      )
      newBindings[payload.index] = payload.binding
      return {
        ...bindings,
        values: newBindings,
      }
    }),
    handle(Actions.setCueBinding, (bindings, { payload }) => {
      const newBindings = [...bindings.cues].map(v =>
        v.waiting ? _.omit(v, 'waiting') : v
      )
      newBindings[payload.index] = payload.binding
      return {
        ...bindings,
        cues: newBindings,
      }
    }),
  ]),
  controls: createReducer(defaultControls, handle => [
    handle(Actions.addValueControl, (controls, { payload }) => {
      const newValues = [...controls.values]
      newValues[payload.index === undefined ? newValues.length : payload.index] =
        payload.control
      return {
        ...controls,
        values: newValues,
      }
    }),
    handle(Actions.deleteValueControl, (controls, { payload }) => {
      const newValues = [...controls.values]
      newValues.splice(payload, 1)
      return {
        ...controls,
        values: newValues,
      }
    }),
    handle(Actions.addCueControl, (controls, { payload }) => {
      const newCues = [...controls.cues]
      newCues[payload.index === undefined ? newCues.length : payload.index] =
        payload.control
      return {
        ...controls,
        cues: newCues,
      }
    }),
    handle(Actions.deleteCueControl, (controls, { payload }) => {
      const newCues = [...controls.cues]
      newCues.splice(payload, 1)
      return {
        ...controls,
        cues: newCues,
      }
    }),
    handle(Actions.rmSource, (controls, { payload }) => {
      return {
        cues: controls.cues.filter(control => !(control.sourceId === payload)),
        values: controls.values.filter(control => !(control.sourceId === payload)),
      }
    }),
  ]),
  playback: createReducer(defaultPlayback, handle => [
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
  sources: createReducer(defaultSources, handle => [
    handle(Actions.addSource, (sources, { payload }) => {
      return {
        ...sources,
        [payload.sourceId]: {
          name: payload.name,
          playback: defaultTrackPlayback,
          trackSources: payload.trackSources,
          bounds: payload.bounds || [],
          selected: false,
          editing: true,
        },
      }
    }),
    handle(Actions.setSourceTrack, (sources, { payload }) => {
      return {
        ...sources,
        [payload.sourceId]: {
          ...sources[payload.sourceId],
          trackSources: {
            ...sources[payload.sourceId].trackSources,
            [payload.trackSourceId]: {
              ...sources[payload.sourceId].trackSources[payload.trackSourceId],
              ...payload.trackSource,
            },
          },
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
    handle(Actions.copySourceBounds, (sources, { payload }) => {
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
  ]),
})
