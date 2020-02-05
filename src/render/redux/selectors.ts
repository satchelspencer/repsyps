import _ from 'lodash'

import * as Types from 'lib/types'
import mappings from 'render/redux/mappings'

export function getValueControlId(
  state: Types.State,
  sourceId: string,
  trackSourceId: string,
  prop: Types.TrackValueProp
) {
  return _.findKey(
    state.controls,
    control =>
      'trackSourceId' in control &&
      control.sourceId === sourceId &&
      control.trackSourceId === trackSourceId &&
      control.prop === prop
  )
}

export function getCueControlId(state: Types.State, sourceId: string, cueIndex: number) {
  return _.findKey(
    state.controls,
    control =>
      'cueIndex' in control &&
      control.sourceId === sourceId &&
      control.cueIndex === cueIndex
  )
}

export function getGlobalControlId(state: Types.State, prop: string) {
  return _.findKey(
    state.controls,
    control => 'global' in control && control.prop === prop
  )
}

export function getControlId(state: Types.State, pcontrol: Partial<Types.Control>) {
  return _.findKey(state.controls, control =>
    _.every(_.keys(pcontrol), prop => control[prop] === pcontrol[prop])
  )
}

export function getValueControlValue(state: Types.State, control: Types.ValueControl) {
  let value = null
  if ('trackSourceId' in control) {
    const source = state.sources[control.sourceId]
    value = source.trackSources[control.trackSourceId][control.prop]
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
