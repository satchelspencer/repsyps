import _ from 'lodash'

import * as Types from 'lib/types'
import * as Actions from 'render/redux/actions'

export function getValueControlIndex(
  state: Types.State,
  sourceId: string,
  trackSourceId: string,
  prop: Types.ValueProp
) {
  return _.findIndex(
    state.controls.values,
    control =>
      control.sourceId === sourceId &&
      control.trackSourceId === trackSourceId &&
      control.prop === prop
  )
}

export function getValueControlValue(state: Types.State, control: Types.ValueControl) {
  const source = state.sources[control.sourceId]
  if (control.trackSourceId) {
    return source.trackSources[control.trackSourceId][control.prop]
  } else return null
}