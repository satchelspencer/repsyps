import React, { useCallback, useMemo, useState } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import { palette } from './theme'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import * as Types from 'lib/types'
import * as Actions from 'src/renderer/redux/actions'

const SidebarWrapper = ctyled.div.styles({
  column: true,
  bg: true,
  color: c => c.nudge(-0.05),
  lined: true,
}).extendSheet`
  width:${({ size }) => size * 25}px;
`

export default function Sidebar() {
  const getMappedState = useCallback((state: Types.State) => {
      return {}
    }, []),
    {} = useMappedState(getMappedState),
    dispatch = useDispatch()

  return <SidebarWrapper>yurt</SidebarWrapper>
}
