import _ from 'lodash'
import { createSelector } from 'reselect'

import * as Types from 'render/util/types'
import mappings from 'render/util/mappings'

export const getSelectedTrackId = (state: Types.State) =>
  Object.keys(state.scenes.tracks).filter(tid => state.scenes.tracks[tid].selected)[0]

export const getSelectedTrack = createSelector(
  [getSelectedTrackId, state => state.scenes.tracks],
  (trackId, tracks) => {
    return tracks[trackId]
  }
)

export const getCurrentScene = (state: Types.State) =>
  state.scenes.list[state.scenes.sceneIndex]

export const getPrevScene = (state: Types.State) =>
  state.scenes.list[state.scenes.sceneIndex - 1]

export const getNextScene = (state: Types.State) =>
  state.scenes.list[state.scenes.sceneIndex + 1]

export function getActiveTrackIds(state: Types.State): string[] {
  const currentScene = state.scenes.list[state.scenes.sceneIndex],
    prevScene = state.scenes.list[state.scenes.sceneIndex - 1],
    lastOfPrev = prevScene && _.last(prevScene.trackIds)

  return lastOfPrev ? [lastOfPrev, ...currentScene.trackIds] : currentScene.trackIds
}

export function getLastOfPrevControls(
  scenes: Types.Scenes,
  sceneIndex: number
): Types.Controls {
  const prevScene = scenes.list[sceneIndex - 1],
    lastOfPrev = prevScene && _.last(prevScene.trackIds)

  return lastOfPrev
    ? _.pickBy(
        prevScene.controls,
        control => 'trackId' in control && control.trackId === lastOfPrev
      )
    : {}
}

export function getControlsAtIndex(
  scenes: Types.Scenes,
  sceneIndex: number
): Types.Controls {
  const currentScene = scenes.list[sceneIndex],
    lastControls = getLastOfPrevControls(scenes, sceneIndex)

  return {
    ...currentScene.controls,
    ...lastControls,
  }
}

export function getControls(scenes: Types.Scenes): Types.Controls {
  return getControlsAtIndex(scenes, scenes.sceneIndex)
}

export const getSeparatedCurrentControls = createSelector(
  [(state: Types.State) => state.scenes],
  scenes => {
    //getControlsAtIndex(scenes, scenes.sceneIndex)
    const sceneIndex = scenes.sceneIndex,
      currentScene = scenes.list[sceneIndex]
    return {
      currentControls: currentScene.controls,
      lastControls: getLastOfPrevControls(scenes, sceneIndex),
    }
  }
) //could be more optimized to depend more specifically on current and prev scene

export const getCurrentControls = createSelector([getSeparatedCurrentControls], sep => ({
  ...sep.lastControls,
  ...sep.currentControls,
}))

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
  if ('trackSourceId' in control) {
    const track = state.scenes.tracks[control.trackId]
    value = track.playback.trackSourcesParams[control.trackSourceId][control.prop]
  } else if ('global' in control) {
    value = state.playback[control.prop]
  }
  value = mappings[control.prop].toStandard(value)
  return value
}

/* TOFIX */
export const getCurrentValueControlsValues = createSelector(
  [getCurrentControls, state => state.scenes.tracks, state => state.playback],
  (controls, tracks, playback) => {
    return _.mapValues(controls, control => {
      if ('prop' in control) {
        let value = null
        if ('trackId' in control && 'trackSourceId' in control) {
          const track = tracks[control.trackId]
          value = track.playback.trackSourcesParams[control.trackSourceId][control.prop]
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
  scenes: Types.Scenes,
  type: Types.BindingType,
  sceneIndex: number
) {
  const controls = getControlsAtIndex(scenes, sceneIndex)
  return getOpenPosition(controls, type)
}

export const makeGetOpenPosition = () =>
  createSelector(
    [getCurrentControls, (_, type: Types.BindingType) => type],
    (controls, type) => getOpenPosition(controls, type)
  )

export const makeGetTrackIsSolo = () =>
  createSelector(
    [(state: Types.State) => state.scenes.tracks, (_, trackId: string) => trackId],
    (tracks, trackId) => {
      return _.every(tracks, (track, thisTrackId) => {
        if (trackId === thisTrackId) return !track.playback.muted
        else return track.playback.muted
      })
    }
  )

export function getTrackIsSolo(state: Types.State, trackId: string) {
  return _.every(state.scenes.tracks, (track, thisTrackId) => {
    if (trackId === thisTrackId) return !track.playback.muted
    else return track.playback.muted
  })
}
