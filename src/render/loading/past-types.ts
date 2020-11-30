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
  PersistentStateV2,
  {
    live: PersistentLiveV1
  }
>

export type PersistentLiveV1 = Assign<
  PersistentLiveV2,
  {
    tracks: {
      [trackId: string]: PersistentTrackV1
    }
  }
>

export type PersistentTrackV1 = Assign<
  PersistentTrackV2,
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
  PersistentStateV3,
  {
    live: PersistentLiveV2
    sources: {
      [sourceId: string]: PersistentSourceV2
    }
  }
>

export type PersistentLiveV2 = Assign<
  PersistentLiveV3,
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

/* v3 turn trackIds back into trackIndex */

export type PersistentStateV3 = Assign<
  Types.PersistentState,
  {
    live: PersistentLiveV3
  }
>

export type PersistentLiveV3 = Assign<
  Types.PersistentLive,
  {
    globalControls: ControlsV3
    scenes: SceneV3[]
  }
>

export type SceneV3 = Assign<
  Types.Scene,
  {
    controls: ControlsV3
  }
>

export type ControlsV3 = Types.Grid<
  Assign<
    Types.ControlGroup,
    {
      controls: ControlV3[]
    }
  >
>

type Id2Index<T extends object> = Assign<
  Omit<T, 'trackId'>,
  {
    trackIndex: number
  }
>

export type ControlV3 =
  | Id2Index<Types.CueControl>
  | Id2Index<Types.CueStepControl>
  | Id2Index<Types.LoopControl>
  | Id2Index<Types.SyncControl>
  | Id2Index<Types.SourceTrackValueControl>
  | Id2Index<Types.TrackValueControl>
  | Types.GlobalValueControl
  | Types.SceneVolumeControl
  | Types.IncrementPeriodControl
  | Types.SceneStepControl
  | Id2Index<Types.JogWheelControl>
  | Id2Index<Types.TrackClickControl>
  | Id2Index<Types.TrackPlayPauseControl>

export type LocalPersistentStateV3 = Assign<
  Types.LocalPersistentState,
  {
    live: LocalPersistentLiveV3
  }
>

export type LocalPersistentLiveV3 = Assign<
  Types.LocalPersistentLive,
  {
    globalControls: ControlsV3
  }
>

export type BindingsFileV3 = Assign<
  Types.BindingsFile,
  {
    globalControls: ControlsV3
  }
>
