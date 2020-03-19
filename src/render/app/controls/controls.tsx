import React, { memo } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import SceneControl from './scene'
import ControlsGrid from './grid'

const ControlsWrapper = ctyled.div.styles({
  height: '35%',
  flex: 'none',
  bg: true,
  column: true,
  lined: true,
}).extendSheet`
  height:100%;
`

function ControlsContainer() {
  return (
    <ControlsWrapper>
      <SceneControl />
      <ControlsGrid />
    </ControlsWrapper>
  )
}

export default memo(ControlsContainer)
