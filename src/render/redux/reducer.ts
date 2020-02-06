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
  defaultSources: Types.Sources = {},
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
    handle(Actions.rmSource, (controls, { payload }) => {
      return _.pickBy(
        controls,
        control => !('sourceId' in control && control.sourceId === payload) //keep only controls that arent tied to a sourec
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
  sources: createReducer(defaultSources, handle => [
    handle(Actions.addCue, (sources, { payload }) => {
      const source = sources[payload.sourceId],
        newCues = [...source.cues]
      newCues[payload.index === undefined ? newCues.length : payload.index] = payload.cue
      return {
        ...sources,
        [payload.sourceId]: {
          ...source,
          cues: newCues,
        },
      }
    }),
    handle(Actions.deleteCue, (sources, { payload }) => {
      const source = sources[payload.sourceId],
        newCues = [...source.cues]
      newCues.splice(payload.index, 1)
      return {
        ...sources,
        [payload.sourceId]: {
          ...source,
          cues: newCues,
        },
      }
    }),
    handle(Actions.applyControl, (sources, { payload }) => {
      const control = payload.control
      if (!('sourceId' in control)) return sources
      else if ('trackSourceId' in control) {
        return {
          ...sources,
          [control.sourceId]: {
            ...sources[control.sourceId],
            trackSources: {
              ...sources[control.sourceId].trackSources,
              [control.trackSourceId]: {
                ...sources[control.sourceId].trackSources[control.trackSourceId],
                [control.prop]: payload.value,
              },
            },
          },
        }
      } else if ('cueIndex' in control && payload.function === 'note-on') {
        return {
          ...sources,
          [control.sourceId]: {
            ...sources[control.sourceId],
            playback: {
              ...sources[control.sourceId].playback,
              ...sources[control.sourceId].cues[control.cueIndex],
            },
          },
        }
      } else return sources
    }),
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
          cues: [],
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
