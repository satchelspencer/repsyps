import _ from 'lodash'

import * as Types from 'render/util/types'
import mappings from 'render/util/mappings'
import isEqual from 'render/util/is-equal'

export function getCurrentScene(state: Types.State): Types.Scene {
  return state.scenes.list[state.scenes.sceneIndex]
}

export function getActiveTrackIds(state: Types.State): string[] {
  const currentScene = state.scenes.list[state.scenes.sceneIndex],
    prevScene = state.scenes.list[state.scenes.sceneIndex - 1],
    lastOfPrev = prevScene && _.last(prevScene.trackIds)

  return lastOfPrev ? [lastOfPrev, ...currentScene.trackIds] : currentScene.trackIds
}

export function getLastOfPrevControlIds(state: Types.State): string[] {
  const prevScene = state.scenes.list[state.scenes.sceneIndex - 1],
    lastOfPrev = prevScene && _.last(prevScene.trackIds)
  return lastOfPrev
    ? Object.keys(prevScene.controls).filter(controlId => {
        const control = prevScene.controls[controlId]
        return 'trackId' in control && control.trackId === lastOfPrev
      })
    : []
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

/* find an existing control that matches the would-be partial control */
export function getMatchingControlId(
  state: Types.State,
  partialControl: Partial<Types.Control>
) {
  return _.findKey(getControls(state.scenes), control =>
    _.every(_.keys(partialControl), prop => control[prop] === partialControl[prop])
  )
}

export function getValueControlValue(state: Types.State, control: Types.ValueControl) {
  let value = null
  if ('sourceId' in control) {
    const track = state.tracks[control.trackId]
    value = track.playback.sources[control.sourceId][control.prop]
  } else if ('global' in control) {
    value = state.playback[control.prop]
  }
  value = mappings[control.prop].toStandard(value)
  return value
}

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

export function getOpenContolPos(
  controls: Types.Controls,
  type: Types.BindingType
): Types.ControlPosition {
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
){
  const controls = getControlsAtIndex(scenes, sceneIndex)
  return getOpenContolPos(controls, type)
}

export function getOpenPosition(
  scenes: Types.Scenes,
  type: Types.BindingType
): Types.ControlPosition {
  const controls = getControls(scenes)
  return getOpenContolPos(controls, type)
}

export function getTrackIsSolo(state: Types.State, trackId: string) {
  return _.every(state.tracks, (track, thisTrackId) => {
    if (trackId === thisTrackId) return !track.playback.muted
    else return track.playback.muted
  })
}
