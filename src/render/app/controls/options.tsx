import React, { memo, useState, useRef, useEffect, useContext, useCallback } from 'react'
import * as _ from 'lodash'
import { useDispatch } from 'react-redux'
import ctyled, { inline } from 'ctyled'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'

import Icon from 'render/components/icon'

const ControlsOptionsWrapper = ctyled.div.styles({
  height: 2.5,
  bg: true,
  color: c => c.nudge(0.1),
  align: 'center',
  padd: 1,
})

function ControlsOptions() {
  return <ControlsOptionsWrapper></ControlsOptionsWrapper>
}

export default memo(ControlsOptions)
