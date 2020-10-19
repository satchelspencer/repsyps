import { createReducer } from 'deox'
import * as _ from 'lodash'
import arrayMove from 'array-move'

import * as Types from 'render/util/types'
import * as Actions from '../actions'
import * as Selectors from '../selectors'
import { defaultState, defaultCue } from '../defaults'

export function getCuePlayback(
  cue: Types.Cue,
  playback: Types.TrackPlayback
): Types.TrackPlayback {
  return {
    ...playback,
    unpause: false,
    playing: true,
    loop: cue.endBehavior !== 'stop',
    chunkIndex: -1,
    chunks: cue.chunks,
  }
}

export function applyCue(
  track: Types.Track,
  source: Types.Source,
  cueIndex: number,
  currentPeriod?: number
): Types.Track {
  const cue = source.cues[cueIndex]
  if (!cue) return track
  const followingCue = source.cues[cueIndex + 1],
    lastPeriod = currentPeriod ?? track.lastPeriod

  if (cue.startBehavior === 'immediate') {
    const hasFollowing = cue.endBehavior === 'next' && followingCue
    return {
      ...track,
      cueIndex: cueIndex,
      nextCueIndex: hasFollowing ? cueIndex + 1 : -1,
      playback: getCuePlayback(cue, track.playback),
      nextPlayback: hasFollowing ? getCuePlayback(followingCue, track.playback) : null,
      lastPeriod,
    }
  } else if (cue.startBehavior === 'on-chunk' || cue.startBehavior === 'on-end') {
    return {
      ...track,
      nextCueIndex: cueIndex,
      playback: {
        ...track.playback,
        nextAtChunk: cue.startBehavior === 'on-chunk',
        unpause: true,
      },
      lastPeriod,
      nextPlayback: getCuePlayback(cue, track.playback),
    }
  } else return track
}

export default createReducer(defaultState, (handle) => [
  handle(Actions.addCue, (state, { payload }) => {
    const track = state.live.tracks[payload.trackId],
      source = track?.sourceId === null ? null : state.sources[track.sourceId]
    if (!source) return state

    const newCues = [...source.cues]
    newCues[payload.index ?? newCues.length] = {
      ...defaultCue,
      chunks: track.playback.chunks,
      endBehavior: track.playback.loop ? 'loop' : 'stop',
      ...payload.cue,
    }
    return {
      ...state,
      sources: {
        ...state.sources,
        [track.sourceId ?? '']: {
          ...source,
          cues: newCues,
        },
      },
    }
  }),
  handle(Actions.deleteCue, (state, { payload }) => {
    const track = state.live.tracks[payload.trackId],
      source = track?.sourceId === null ? null : state.sources[track.sourceId]
    if (!source) return state

    const newCues = [...source.cues]
    newCues.splice(payload.index, 1)
    return {
      ...state,
      sources: {
        ...state.sources,
        [track.sourceId ?? '']: {
          ...source,
          cues: newCues,
        },
      },
    }
  }),
  handle(Actions.reorderCue, (state, { payload }) => {
    const track = state.live.tracks[payload.trackId],
      source = track?.sourceId === null ? null : state.sources[track.sourceId]

    if (!source) return state
    const newCues = arrayMove(source.cues, payload.oldIndex, payload.newIndex)

    return {
      ...state,
      sources: {
        ...state.sources,
        [track.sourceId ?? '']: {
          ...source,
          cues: newCues,
        },
      },
    }
  }),
  handle(Actions.stepTrackCue, (state, { payload }) => {
    const trackId =
      payload.trackId || Selectors.getTrackIdByIndex(state.live, payload.trackIndex ?? 0)
    let newLive = state.live

    if (trackId) {
      const track = state.live.tracks[trackId],
        currentIndex = track.cueIndex,
        nextIndex = currentIndex + payload.cueStep,
        source = track?.sourceId === null ? null : state.sources[track.sourceId]

      if (!source) return state

      if (!track.playback.playing && track.cueIndex !== -1) {
        newLive = {
          ...state.live,
          tracks: {
            ...state.live.tracks,
            [trackId]: {
              ...track,
              playback: {
                ...track.playback,
                playing: true,
              },
              lastPeriod: state.playback.period,
            },
          },
        }
      } else if (nextIndex >= 0 && nextIndex < source.cues.length) {
        newLive = {
          ...state.live,
          tracks: {
            ...state.live.tracks,
            [trackId]: applyCue(track, source, nextIndex, state.playback.period),
          },
        }
      } else
        newLive = {
          ...state.live,
          tracks: {
            ...state.live.tracks,
            [trackId]: {
              ...track,
              playback: {
                ...track.playback,
                playing: false,
              },
              nextPlayback: null,
              cueIndex: -1,
            },
          },
        }
    }

    return {
      ...state,
      live: newLive,
      playback: {
        ...state.playback,
        playing: true,
      },
    }
  }),
  handle(Actions.setTrackCue, (state, { payload }) => {
    const trackId =
      payload.trackId || Selectors.getTrackIdByIndex(state.live, payload.trackIndex ?? 0)
    if (!trackId) return state

    const track = state.live.tracks[trackId],
      source = track?.sourceId === null ? null : state.sources[track.sourceId]
    if (!source) return state

    return {
      ...state,
      live: trackId
        ? {
            ...state.live,
            tracks: {
              ...state.live.tracks,
              [trackId]: applyCue(
                state.live.tracks[trackId],
                source,
                payload.cueIndex,
                state.playback.period
              ),
            },
          }
        : state.live,
      playback: {
        ...state.playback,
        playing: true,
      },
    }
  }),
])
