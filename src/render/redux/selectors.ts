import _ from 'lodash'
import { createSelector } from 'reselect'

import * as Types from 'render/util/types'
import mappings from 'render/util/mappings'

export const getSelectedTrackId = (state: Types.State) =>
  Object.keys(state.live.tracks).filter(tid => state.live.tracks[tid].selected)[0]

export const getSelectedTrack = createSelector(
  [getSelectedTrackId, state => state.live.tracks],
  (trackId, tracks) => {
    return tracks[trackId]
  }
)

export const getCurrentScene = (state: Types.State) =>
  state.live.scenes[state.live.sceneIndex]

export const getPrevScene = (state: Types.State) =>
  state.live.scenes[state.live.sceneIndex - 1]

export const getNextScene = (state: Types.State) =>
  state.live.scenes[state.live.sceneIndex + 1]

export function getActiveTrackIds(state: Types.State): string[] {
  const currentScene = state.live.scenes[state.live.sceneIndex],
    prevScene = state.live.scenes[state.live.sceneIndex - 1],
    lastOfPrev = prevScene && _.last(prevScene.trackIds)

  return lastOfPrev ? [lastOfPrev, ...currentScene.trackIds] : currentScene.trackIds
}

export function getLastOfPrevControls(
  scenes: Types.Scene[],
  sceneIndex: number
): Types.Controls {
  const prevScene = scenes[sceneIndex - 1],
    lastOfPrev = prevScene && _.last(prevScene.trackIds)

  return lastOfPrev
    ? _.pickBy(
        prevScene.controls,
        control => 'trackId' in control && control.trackId === lastOfPrev
      )
    : {}
}

export function getControlsAtIndex(live: Types.Live, sceneIndex: number): Types.Controls {
  const currentScene = live.scenes[sceneIndex],
    lastControls = getLastOfPrevControls(live.scenes, sceneIndex)

  return {
    ...currentScene.controls,
    ...lastControls,
  }
}

export function getControls(live: Types.Live): Types.Controls {
  return getControlsAtIndex(live, live.sceneIndex)
}

export const getScenes = (state: Types.State) => state.live.scenes

export const getSceneIndex = (state: Types.State) => state.live.sceneIndex

export const getOnlyCurrentControls = createSelector(
  [getScenes, getSceneIndex],
  (scenes, sceneIndex) => {
    return scenes[sceneIndex].controls
  }
)

export const getCurrentLastOfPrev = createSelector(
  [getScenes, getSceneIndex],
  (scenes, sceneIndex) => getLastOfPrevControls(scenes, sceneIndex)
)

export const getCurrentControls = createSelector(
  [getOnlyCurrentControls, getCurrentLastOfPrev],
  (current, last) => {
    return {
      ...current,
      ...last,
    }
  }
)

export const makeGetMatchingControl = () =>
  createSelector(
    [getCurrentControls, (_, partialControl: Partial<Types.Control>) => partialControl],
    (controls, partialControl) => {
      const controlId = _.findKey(controls, control =>
        _.every(_.keys(partialControl), prop => control[prop] === partialControl[prop])
      )
      return {
        controlId,
        control: controls[controlId],
      }
    }
  )

export function getValueControlValue(state: Types.State, control: Types.ValueControl) {
  let value = null
  if ('sourceTrackId' in control) {
    const track = state.live.tracks[control.trackId]
    value = track.playback.sourceTracksParams[control.sourceTrackId][control.prop]
  } else if ('global' in control) {
    value = state.playback[control.prop]
  }
  value = mappings[control.prop].toStandard(value)
  return value
}

export const getCurrentValueControlsValues = createSelector(
  [getCurrentControls, state => state.live.tracks, state => state.playback],
  (controls, tracks, playback) => {
    return _.mapValues(controls, control => {
      if ('prop' in control) {
        let value = null
        if ('trackId' in control && 'sourceTrackId' in control) {
          const track = tracks[control.trackId]
          value = track.playback.sourceTracksParams[control.sourceTrackId][control.prop]
        } else if ('trackId' in control) {
          const track = tracks[control.trackId]
          value = track.playback[control.prop]
        } else if ('global' in control) {
          value = playback[control.prop]
        }
        value = mappings[control.prop].toStandard(value)
        return value
      } else return 0
    })
  }
)

export function getControlByPosition(
  controls: Types.Controls,
  position: Types.ControlPosition
) {
  return _.find(
    controls,
    control => control.position.x === position.x && control.position.y === position.y
  )
}

export function getBindingByPosition(
  bindings: Types.Bindings,
  position: Types.ControlPosition
) {
  return _.find(
    bindings,
    binding => binding.position.x === position.x && binding.position.y === position.y
  )
}

function getOpenPosition(controls: Types.Controls, type: Types.BindingType) {
  const usedXes: { [x: number]: boolean } = {},
    controlValues = _.values(controls),
    maxX = controlValues.length
      ? _.maxBy(controlValues, control => {
          if (control.type !== type) return 0
          else {
            const x = control.position.x
            usedXes[x] = true
            return x
          }
        }).position.x
      : 0,
    freeX = _.range(maxX + 2).find(x => !usedXes[x])
  return {
    x: freeX,
    y: type === 'value' ? 0 : 1,
  }
}

export function getOpenPositionAtIndex(
  live: Types.Live,
  type: Types.BindingType,
  sceneIndex: number
) {
  const controls = getControlsAtIndex(live, sceneIndex)
  return getOpenPosition(controls, type)
}

export const makeGetOpenPosition = () =>
  createSelector(
    [getCurrentControls, (_, type: Types.BindingType) => type],
    (controls, type) => getOpenPosition(controls, type)
  )

export const makeGetTrackIsSolo = () =>
  createSelector(
    [(state: Types.State) => state.live.tracks, (_, trackId: string) => trackId],
    (tracks, trackId) => {
      return _.every(tracks, (track, thisTrackId) => {
        if (trackId === thisTrackId) return !track.playback.muted
        else return track.playback.muted
      })
    }
  )

export function getTrackIsSolo(state: Types.State, trackId: string) {
  return _.every(state.live.tracks, (track, thisTrackId) => {
    if (trackId === thisTrackId) return !track.playback.muted
    else return track.playback.muted
  })
}
