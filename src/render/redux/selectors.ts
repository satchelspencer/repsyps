import _ from 'lodash'

import * as Types from 'render/util/types'
import mappings from 'render/util/mappings'
import isEqual from 'render/util/is-equal'

export function getCurrentScene(state: Types.State): Types.Scene{
  return state.scenes.list[state.scenes.sceneIndex]
}

export function getControls(state: Types.State): Types.Controls {
  return getCurrentScene(state).controls
}

/* find an existing control that matches the would-be partial control */
export function getMatchingControlId(
  state: Types.State,
  partialControl: Partial<Types.Control>
) {
  return _.findKey(getControls(state), control =>
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

export function getOpenPosition(
  state: Types.State,
  type: Types.BindingType
): Types.ControlPosition {
  const openVbinding = _.find(
    _.sortBy(_.values(state.bindings), b => b.position.x),
    binding =>
      binding.type === type && !getControlByPosition(getControls(state), binding.position)
  )
  if (openVbinding) return openVbinding.position
  else {
    const corbs = _.values({ ...getControls(state), ...state.bindings }),
      maxX =
        _.max(corbs.filter(corb => corb.type === type).map(c => c.position.x + 1)) || 0

    return {
      x: maxX,
      y: type === 'value' ? 0 : 1,
    }
  }
}

export function getTrackIsSolo(state: Types.State, trackId: string) {
  return _.every(state.tracks, (track, thisTrackId) => {
    if (trackId === thisTrackId) return !track.playback.muted
    else return track.playback.muted
  })
}
