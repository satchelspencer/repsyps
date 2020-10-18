import * as Types from 'render/util/types'

export type Assign<T, R> = Omit<T, keyof R> & R

/* v0 */
export type PersistentStateV0 = Assign<
  PersistentStateV1,
  {
    live: Assign<
      PersistentLiveV1,
      {
        tracks: {
          [trackId: string]: Omit<PersistentTrackV1, 'sourceId'>
        }
      }
    >
  }
>

/* v1 */

export type PersistentStateV1 = Assign<
  Types.PersistentState,
  {
    live: PersistentLiveV1
  }
>

export type PersistentLiveV1 = Assign<
  Types.PersistentLive,
  {
    tracks: {
      [trackId: string]: PersistentTrackV1
    }
  }
>

export type PersistentTrackV1 = Assign<
  Types.PersistentTrack,
  {
    cues: CueV1[]
  }
>

export type CueV1 = Assign<
  Types.Cue,
  {
    playback: Types.TrackPlayback
    used: (keyof Types.TrackPlayback)[]
  }
>

/* v2 */

export type PersistentStateV2 = Assign<
  Types.PersistentState,
  {
    live: PersistentLiveV2
    sources: {
      [sourceId: string]: PersistentSourceV2
    }
  }
>

export type PersistentLiveV2 = Assign<
  Types.PersistentLive,
  {
    tracks: {
      [trackId: string]: PersistentTrackV2
    }
  }
>

export type PersistentTrackV2 = Assign<
  Types.PersistentTrack,
  {
    cues: Types.Cue[]
  }
>

export type PersistentSourceV2 = Omit<Types.PersistentSource, 'cues'>
