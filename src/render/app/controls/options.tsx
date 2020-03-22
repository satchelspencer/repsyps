import React, { memo, useState, useRef, useEffect, useContext, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled, { inline } from 'ctyled'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'

import Icon from 'render/components/icon'

const ControlsOptionsWrapper = ctyled.div.styles({
  width: 1.5,
  bg: true,
  color: c => c.nudge(0.05),
  align: 'center',
  padd: 1,
  column: true,
  gutter: 1.5,
  size: s => s * 1.3,
  justify: 'space-between',
})

const OptionsGroup = ctyled.div.styles({
  flex: 1,
  column: true,
  gutter: 1.7,
  align: 'center',
})

export interface OptionsProps {
  onIncZoom: (diff: number) => void
}

function ControlsOptions(props: OptionsProps) {
  const enabled = useSelector(state => state.live.controlsEnabled),
    dispatch = useDispatch()

  return (
    <ControlsOptionsWrapper>
      <OptionsGroup>
        <Icon asButton name="zoom-in" onClick={() => props.onIncZoom(-1)} />
        <Icon asButton name="zoom-out" onClick={() => props.onIncZoom(+1)} />
        <Icon
          asButton
          styles={{
            size: s => s * 0.8,
            color: c => (enabled ? c : c.as(['#ff000080', '#ff000080'])),
          }}
          name={enabled ? 'volume' : 'volume_mute'}
          onClick={() => dispatch(Actions.setControlsEnabled(!enabled))}
        />
        <Icon
          asButton
          styles={{ size: s => s * 1.1 }}
          name="replay"
          onClick={() => dispatch(Actions.zeroInitValues({}))}
        />
      </OptionsGroup>
      <Icon
        asButton
        styles={{ size: s => s * 1 }}
        name="close-thin"
        onClick={() => dispatch(Actions.clearControls({}))}
      />
    </ControlsOptionsWrapper>
  )
}

export default memo(ControlsOptions)
