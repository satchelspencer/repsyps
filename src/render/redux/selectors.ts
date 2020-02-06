import _ from 'lodash'

import * as Types from 'render/util/types'
import mappings from 'render/util/mappings'

/* find an existing control that matches the would-be partial control */
export function getMatchingControlId(
  state: Types.State,
  partialControl: Partial<Types.Control>
) {
  return _.findKey(state.controls, control =>
    _.every(_.keys(partialControl), prop => control[prop] === partialControl[prop])
  )
}

export function getValueControlValue(state: Types.State, control: Types.ValueControl) {
  let value = null
  if ('trackChannelId' in control) {
    const track = state.tracks[control.trackId]
    value = track.trackChannels[control.trackChannelId][control.prop]
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
      binding.type === type && !getControlByPosition(state.controls, binding.position)
  )
  if (openVbinding) return openVbinding.position
  else {
    const corbs = _.values({ ...state.controls, ...state.bindings }),
      maxX =
        _.max(corbs.filter(corb => corb.type === type).map(c => c.position.x + 1)) || 0

    return {
      x: maxX,
      y: type === 'value' ? 0 : 1,
    }
  }
}
