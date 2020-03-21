import React, { memo, useState, useRef, useEffect, useContext, useCallback } from 'react'
import * as _ from 'lodash'
import { useDispatch } from 'react-redux'
import ctyled, { inline } from 'ctyled'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'

import Icon from 'render/components/icon'

const HEIGHT = 1.9

const ControlsOptionsWrapper = ctyled.div.styles({
  height: 2.5,
  bg: true,
  color: c => c.nudge(0.1),
  align: 'center',
  padd: 1,
})

const PickerWrapper = ctyled.div.class(inline).styles({
  color: c => c.nudge(0.05).contrast(0.1),
  height: HEIGHT,
  bg: false,
  size: s => s * 0.85,
  width: 9,
}).extendSheet`

`

const OptionsInputInner = ctyled.div.styles({
  bg: true,
  rounded: true,
  border: 1,
  lined: true,
  borderColor: c => c.contrast(-0.1),
  align: 'center',
  column: true,
}).extendSheet`
  position:absolute;
  bottom:0;
  left:0;
  width:100%;
  min-height:100%;
`

const OptionsInput = ctyled.input.class(inline).styles({
  border: false,
  bg: false,
  width: '100%',
  padd: 1,
}).extendSheet`
  outline:none;
  height:${({ size }) => size * HEIGHT - 2}px;
`

const OptionsValue = ctyled.div.styles({
  border: false,
  bg: false,
  width: '100%',
  padd: 1,
  align: 'center',
  justify: 'space-between',
}).extendSheet`
  height:${({ size }) => size * HEIGHT - 2}px;
`

function ControlsOptions() {
  return (
    <ControlsOptionsWrapper>
      <PickerWrapper>
        <OptionsInputInner>
          {/* <OptionsInput placeholder="enter preset name" /> */}
          <OptionsValue>
            <span>Load Preset</span>
            <Icon styles={{ size: s => s * 1.2 }} name="caret-up" />
          </OptionsValue>
        </OptionsInputInner>
      </PickerWrapper>
    </ControlsOptionsWrapper>
  )
}

export default memo(ControlsOptions)
