import { createReducer } from 'deox'
import * as _ from 'lodash'
import arrayMove from 'array-move'

import * as Types from 'render/util/types'
import * as Actions from '../actions'
import * as Selectors from '../selectors'
import { defaultState } from '../defaults'

/* if a cue doesnt esist in the new sources, just set its volume in the old to 0. */
function mergeTrackSourcesParams(
  dest: Types.TrackSourcesParams,
  src: Types.TrackSourcesParams
) {
  return _.mapValues(
    {
      ...dest,
      ...src,
    },
    (srcConfig, sourceId) => {
      if (!src[sourceId])
        return {
          ...srcConfig,
          volume: 0,
          offset: 0,
        }
      else return srcConfig
    }
  )
}

export function getCuePlayback(
  cue: Types.Cue,
  playback: Types.TrackPlayback
): Types.TrackPlayback {
  return {
    ...playback,
    ..._.pick(cue.playback, cue.used),
    unpause: false,
    loop: cue.endBehavior !== 'stop',
    sourceTracksParams: cue.used.includes('sourceTracksParams')
      ? mergeTrackSourcesParams(
          playback.sourceTracksParams,
          cue.playback.sourceTracksParams
        )
      : playback.sourceTracksParams,
  }
}

export function applyCue(track: Types.Track, cueIndex: number): Types.Track {
  const cue = track.cues[cueIndex]
  if (!cue) return track
  const followingCue = track.cues[cueIndex + 1]

  if (cue.startBehavior === 'immediate') {
    const hasFollowing = cue.endBehavior === 'next' && followingCue
    return {
      ...track,
      cueIndex: cueIndex,
      nextCueIndex: hasFollowing ? cueIndex + 1 : -1,
      playback: getCuePlayback(cue, track.playback),
      nextPlayback: hasFollowing ? getCuePlayback(followingCue, track.playback) : null,
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
      nextPlayback: getCuePlayback(cue, track.playback),
    }
  } else return track
}

export default createReducer(defaultState, (handle) => [
  handle(Actions.addCue, (state, { payload }) => {
    const track = state.live.tracks[payload.trackId],
      newCues = [...track.cues]
    newCues[payload.index === undefined ? newCues.length : payload.index] = payload.cue
    return {
      ...state,
      live: {
        ...state.live,
        tracks: {
          ...state.live.tracks,
          [payload.trackId]: {
            ...track,
            cues: newCues,
          },
        },
      },
    }
  }),
  handle(Actions.deleteCue, (state, { payload }) => {
    const track = state.live.tracks[payload.trackId],
      newCues = [...track.cues]
    newCues.splice(payload.index, 1)
    return {
      ...state,
      live: {
        ...state.live,
        tracks: {
          ...state.live.tracks,
          [payload.trackId]: {
            ...track,
            cues: newCues,
          },
        },
      },
    }
  }),
  handle(Actions.reorderCue, (state, { payload }) => {
    const track = state.live.tracks[payload.trackId],
      newCues = arrayMove(track.cues, payload.oldIndex, payload.newIndex)
    return {
      ...state,
      live: {
        ...state.live,
        tracks: {
          ...state.live.tracks,
          [payload.trackId]: {
            ...track,
            cues: newCues,
          },
        },
      },
    }
  }),
  handle(Actions.stepTrackCue, (state, { payload }) => {
    const trackId =
      payload.trackId || Selectors.getTrackIdByIndex(state.live, payload.trackIndex)
    let newLive = state.live

    if (trackId) {
      const track = state.live.tracks[trackId],
        currentIndex = track.cueIndex,
        nextIndex = currentIndex + payload.cueStep

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
            },
          },
        }
      } else if (nextIndex >= 0 && nextIndex < track.cues.length) {
        newLive = {
          ...state.live,
          tracks: {
            ...state.live.tracks,
            [trackId]: applyCue(track, nextIndex),
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
      payload.trackId || Selectors.getTrackIdByIndex(state.live, payload.trackIndex)

    return {
      ...state,
      live: trackId
        ? {
            ...state.live,
            tracks: {
              ...state.live.tracks,
              [trackId]: applyCue(state.live.tracks[trackId], payload.cueIndex),
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
