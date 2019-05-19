import React, { useCallback } from 'react'
import ctyled from 'ctyled'
import { useMappedState } from 'redux-react-hook'
import { palette } from '../styles/theme'

import * as Types from '../redux/types'

const Wrapper = ctyled.div.styles({
  height: 0.4,
  alignSelf: 'stretch',
  flex: 1,
  bg: true,
  color: c => c.nudge(0.2)
}).extend`
  overflow:hidden;
`

const Indicator = ctyled.div.attrs({ frac: 0 }).styles({
  color: c => c.as(palette.primary_red).invert(),
  bg: true,
  rounded: true
}).extend`
  position:absolute;
  top:0;
  left:0;
  bottom:0;
  width:${(_, { frac }) => frac * 100}%;
`

export default function FracIndicator() {
  const getMappedState = useCallback((state: Types.AppState) => state.mix.frac, []),
    frac = useMappedState(getMappedState)
  return (
    <Wrapper>
      <Indicator frac={frac} />
    </Wrapper>
  )
}
