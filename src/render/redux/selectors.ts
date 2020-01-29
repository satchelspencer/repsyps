import _ from 'lodash'

import * as Types from 'lib/types'

export function getValueControlId(
  state: Types.State,
  sourceId: string,
  prop: Types.ValueProp
) {
  return _.find(Object.keys(state.controls), controlId => {
    const control = state.controls[controlId]
    return 'prop' in control && control.sourceId === sourceId && control.prop === prop
  })
}
