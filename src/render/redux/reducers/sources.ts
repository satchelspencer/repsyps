import { createReducer } from 'deox'
import * as _ from 'lodash'
import pathUtils from 'path'

import * as Actions from '../actions'
import * as Selectors from '../selectors'
import * as Types from 'render/util/types'
import { defaultState, defaultTrackSourceParams } from '../defaults'
import getImpulses from 'render/util/impulse-detect'

import inferTimeBase from 'render/util/infer-timebase'

export function makeSourceTracksRelative(
  source: Types.Source,
  path: string | null
): Types.Source {
  const base = path && pathUtils.dirname(path)
  return {
    ...source,
    sourceTracks: _.mapValues(source.sourceTracks, (sourceTrack) => {
      if (sourceTrack.source && pathUtils.isAbsolute(sourceTrack.source) && path)
        return {
          ...sourceTrack,
          source: pathUtils.relative(base ?? '', sourceTrack.source),
          base,
        }
      else return sourceTrack
    }),
  }
}

export default createReducer(defaultState, (handle) => [
  handle(Actions.setTrackSourceParams, (state, { payload }) => {
    const trackId = Selectors.getTrackId(state.live, payload.trackId),
      sourceTrackId =
        payload.sourceTrackId ||
        (trackId &&
          _.keys(state.live.tracks[trackId].playback.sourceTracksParams)[
            payload.sourceTrackIndex ?? 0
          ])

    if (!trackId || !sourceTrackId) return state
    else
      return {
        ...state,
        live: {
          ...state.live,
          tracks: {
            ...state.live.tracks,
            [trackId]: {
              ...state.live.tracks[trackId],
              playback: {
                ...state.live.tracks[trackId].playback,
                sourceTracksParams: {
                  ...state.live.tracks[trackId].playback.sourceTracksParams,
                  [sourceTrackId]: {
                    ...state.live.tracks[trackId].playback.sourceTracksParams[
                      sourceTrackId
                    ],
                    ...payload.sourceTrackParams,
                  },
                },
              },
            },
          },
        },
      }
  }),
  handle(Actions.soloTrackSource, (state, { payload }) => {
    const trackId = Selectors.getTrackId(state.live, payload.trackId),
      sourceTrackId =
        payload.sourceTrackId ||
        (trackId &&
          _.keys(state.live.tracks[trackId].playback.sourceTracksParams)[
            payload.sourceTrackIndex ?? 0
          ])

    if (!trackId || !sourceTrackId) return state
    else
      return {
        ...state,
        live: {
          ...state.live,
          tracks: {
            ...state.live.tracks,
            [trackId]: {
              ...state.live.tracks[trackId],
              playback: {
                ...state.live.tracks[trackId].playback,
                sourceTracksParams: _.mapValues(
                  state.live.tracks[trackId].playback.sourceTracksParams,
                  (params, id) => {
                    return {
                      ...params,
                      volume: sourceTrackId === id ? 1 : 0,
                    }
                  }
                ),
              },
            },
          },
        },
      }
  }),
  handle(Actions.editSourceTrack, (state, { payload }) => {
    return {
      ...state,
      live: {
        ...state.live,
        tracks: {
          ...state.live.tracks,
          [payload.trackId]: {
            ...state.live.tracks[payload.trackId],
            sourceTrackEditing: payload.sourceTrackEditing,
          },
        },
      },
    }
  }),
  handle(Actions.setVisibleSourceTrack, (state, { payload }) => {
    return {
      ...state,
      live: {
        ...state.live,
        tracks: {
          ...state.live.tracks,
          [payload.trackId]: {
            ...state.live.tracks[payload.trackId],
            visibleSourceTrack: payload.visibleSourceTrack,
          },
        },
      },
    }
  }),
  handle(Actions.createSource, (state, { payload }) => {
    const newSource: Types.Source = {
      name: payload.name,
      bounds: payload.bounds,
      boundsAlpha: 1,
      sourceTracks: {
        [payload.sourceId]: {
          name: payload.name,
          source: payload.source,
          loaded: payload.loaded,
          missing: false,
          streamIndex: 0,
          base: null,
        },
      },
      cues: [],
    }
    return {
      ...state,
      sources: {
        ...state.sources,
        [payload.sourceId]: makeSourceTracksRelative(newSource, state.save.path),
      },
    }
  }),
  handle(Actions.createTrackSource, (state, { payload }) => {
    return {
      ...state,
      sources: {
        ...state.sources,
        [payload.sourceId]: makeSourceTracksRelative(
          {
            ...state.sources[payload.sourceId],
            sourceTracks: {
              ...state.sources[payload.sourceId].sourceTracks,
              [payload.sourceTrackId]: payload.sourceTrack,
            },
          },
          state.save.path
        ),
      },
      live: {
        ...state.live,
        tracks: {
          ...state.live.tracks,
          [payload.sourceId]: {
            ...state.live.tracks[payload.sourceId],
            playback: {
              ...state.live.tracks[payload.sourceId].playback,
              sourceTracksParams: {
                ...state.live.tracks[payload.sourceId].playback.sourceTracksParams,
                [payload.sourceTrackId]: defaultTrackSourceParams, //start at zeroes
              },
            },
          },
        },
      },
    }
  }),
  handle(Actions.didLoadTrackSource, (state, { payload }) => {
    return {
      ...state,
      sources: {
        ...state.sources,
        [payload.sourceId]: {
          ...state.sources[payload.sourceId],
          sourceTracks: {
            ...state.sources[payload.sourceId].sourceTracks,
            [payload.sourceTrackId]: {
              ...state.sources[payload.sourceId].sourceTracks[payload.sourceTrackId],
              loaded: payload.loaded,
              missing:
                payload.missing === undefined
                  ? state.sources[payload.sourceId].sourceTracks[payload.sourceTrackId]
                      .missing
                  : payload.missing,
            },
          },
        },
      },
    }
  }),
  handle(Actions.relinkTrackSource, (state, { payload }) => {
    return {
      ...state,
      sources: {
        ...state.sources,
        [payload.sourceId]: makeSourceTracksRelative(
          {
            ...state.sources[payload.sourceId],
            sourceTracks: {
              ...state.sources[payload.sourceId].sourceTracks,
              [payload.sourceTrackId]: {
                ...state.sources[payload.sourceId].sourceTracks[payload.sourceTrackId],
                source: payload.newSource,
                loaded: false,
                missing: false,
              },
            },
          },
          state.save.path
        ),
      },
    }
  }),
  handle(Actions.removeTrackSource, (state, { payload }) => {
    const newSourceTracksParams = _.omit(
        state.live.tracks[payload.sourceId].playback.sourceTracksParams,
        payload.sourceTrackId
      ),
      currentVisible = state.live.tracks[payload.sourceId].visibleSourceTrack,
      currentEditing = state.live.tracks[payload.sourceId].sourceTrackEditing

    return {
      ...state,
      sources: {
        ...state.sources,
        [payload.sourceId]: {
          ...state.sources[payload.sourceId],
          sourceTracks: _.omit(
            state.sources[payload.sourceId].sourceTracks,
            payload.sourceTrackId
          ),
        },
      },
      live: {
        ...state.live,
        tracks: {
          ...state.live.tracks,
          [payload.sourceId]: {
            ...state.live.tracks[payload.sourceId],
            sourceTrackEditing:
              currentEditing === payload.sourceTrackId ? null : currentEditing,
            visibleSourceTrack:
              payload.sourceTrackId === currentVisible
                ? _.keys(newSourceTracksParams)[0]
                : currentVisible,
            playback: {
              ...state.live.tracks[payload.sourceId].playback,
              sourceTracksParams: newSourceTracksParams,
            },
          },
        },
      },
    }
  }),
  handle(Actions.setSourceBounds, (state, { payload }) => {
    return {
      ...state,
      sources: {
        ...state.sources,
        [payload.sourceId]: {
          ...state.sources[payload.sourceId],
          bounds: payload.bounds,
        },
      },
    }
  }),
  handle(Actions.copyTrackBounds, (state, { payload }) => {
    const fromSourceId = state.live.tracks[payload.src].sourceId,
      toSourceId = state.live.tracks[payload.dest].sourceId,
      from = state.sources[fromSourceId ?? ''],
      to = state.sources[toSourceId ?? '']

    if (fromSourceId && toSourceId)
      return {
        ...state,
        sources: {
          ...state.sources,
          [toSourceId]: {
            ...to,
            bounds: [...from.bounds],
          },
        },
      }
    else return state
  }),
  handle(Actions.setSourceAlpha, (state, { payload }) => {
    return {
      ...state,
      sources: {
        ...state.sources,
        [payload.sourceId]: {
          ...state.sources[payload.sourceId],
          boundsAlpha: payload.boundsAlpha,
        },
      },
    }
  }),
  handle(Actions.inferBounds, (state, { payload }) => {
    const track = state.live.tracks[payload.sourceId],
      [cstart, clength] = track.playback.chunks,
      impulses = getImpulses(payload.sourceId),
      snap = state.settings.snap
    if (!clength || !impulses) return state
    else {
      const inferred = inferTimeBase(track.playback.chunks, impulses, snap),
        existingBounds = state.sources[payload.sourceId].bounds,
        cend = cstart + clength

      let newBounds = inferred
      if (payload.direction === 'left')
        newBounds = _.sortBy([
          ...inferred.filter((bound) => bound <= cend),
          ...existingBounds.filter((bound) => bound > cend),
        ])
      else if (payload.direction === 'right')
        newBounds = _.sortBy([
          ...existingBounds.filter((bound) => bound < cstart),
          ...inferred.filter((bound) => bound >= cstart),
        ])

      return {
        ...state,
        sources: {
          ...state.sources,
          [payload.sourceId]: {
            ...state.sources[payload.sourceId],
            bounds: newBounds,
          },
        },
      }
    }
  }),
  handle(Actions.moveSourceTrack, (state, { payload }) => {
    return {
      ...state,
      sources: {
        ...state.sources,
        [payload.sourceId]: {
          ...state.sources[payload.sourceId],
          sourceTracks: {
            ...state.sources[payload.sourceId].sourceTracks,
            [payload.sourceTrackId]: {
              ...state.sources[payload.sourceId].sourceTracks[payload.sourceTrackId],
              source: payload.source,
            },
          },
        },
      },
    }
  }),
])
