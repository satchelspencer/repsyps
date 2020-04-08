import { createReducer } from 'deox'
import * as _ from 'lodash'
import pathUtils from 'path'

import * as Actions from '../actions'
import * as Selectors from '../selectors'
import * as Types from 'render/util/types'
import { defaultState, defaultTrackSourceParams } from '../defaults'

export function makeSourceTracksRelative(
  source: Types.Source,
  path: string
): Types.Source {
  return {
    ...source,
    sourceTracks: _.mapValues(source.sourceTracks, (sourceTrack) => {
      if (sourceTrack.source && pathUtils.isAbsolute(sourceTrack.source) && path)
        return {
          ...sourceTrack,
          source: pathUtils.relative(path, sourceTrack.source),
        }
      else return sourceTrack
    }),
  }
}

export default createReducer(defaultState, (handle) => [
  handle(Actions.setTrackSourceParams, (state, { payload }) => {
    const trackId =
        payload.trackId || Selectors.getTrackIdByIndex(state.live, payload.trackIndex),
      sourceTrackId =
        payload.sourceTrackId ||
        (trackId &&
          _.keys(state.live.tracks[trackId].playback.sourceTracksParams)[
            payload.sourceTrackIndex
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
    return {
      ...state,
      sources: {
        ...state.sources,
        [payload.sourceId]: makeSourceTracksRelative(payload.source, state.save.path),
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
                [payload.sourceTrackId]: defaultTrackSourceParams,
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
            cues: state.live.tracks[payload.sourceId].cues.map((cue) => {
              if (cue.playback.sourceTracksParams[payload.sourceTrackId]) {
                return {
                  ...cue,
                  playback: {
                    ...cue.playback,
                    sourceTracksParams: _.omit(
                      cue.playback.sourceTracksParams,
                      payload.sourceTrackId
                    ),
                  },
                }
              } else return cue
            }),
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
    const from = state.sources[payload.src],
      to = state.sources[payload.dest]

    if (from && to)
      return {
        ...state,
        sources: {
          ...state.sources,
          [payload.dest]: {
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
])
