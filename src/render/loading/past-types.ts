import * as Types from 'render/util/types'

export type PersistentStateV0 = Types.PersistentState & {
  live: Types.PersistentLive & {
    tracks: {
      [trackId: string]: Omit<Types.PersistentTrack, 'sourceId'>
    }
  }
}
