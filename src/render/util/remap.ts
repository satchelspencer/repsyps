import _ from 'lodash'

import * as Types from 'render/util/types'

export type IdMap = { [id: string]: string }

export function remap(input: Types.State, idMap: IdMap): Types.State {
  const state = applyIdMap(input, idMap)
  return {
    ...state,
    live: {
      ...state.live,
      scenes: state.live.scenes.map((scene) => {
        return {
          ...scene,
          trackIds: scene.trackIds.map((id) => idMap[id] || id),
        }
      }),
      tracks: _.mapValues(state.live.tracks, (track) => {
        return {
          ...track,
          visibleSourceTrack:
            idMap[track.visibleSourceTrack ?? ''] || track.visibleSourceTrack,
        }
      }),
    },
  }
}

export function applyIdMap<T>(obj: T, idMap: IdMap): T {
  if (_.isPlainObject(obj)) {
    const res = {}
    for (var key in obj) {
      const k = idMap[key] || key
      res[k] = applyIdMap(obj[key], idMap)
    }
    return res as T
  } else if (_.isArray(obj)) {
    return obj.map((v) => applyIdMap(v, idMap)) as any
  } else return obj
}
