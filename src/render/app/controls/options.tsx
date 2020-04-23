import React, { memo, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Types from 'render/util/types'

import Icon from 'render/components/icon'
import extend from 'render/util/extend'
import { resetTiming } from 'render/components/timing'
import useResetScene from 'render/util/reset-scene'

const ControlsOptionsWrapper = ctyled.div.styles({
  width: 1.5,
  bg: true,
  color: (c) => c.nudge(0.05),
  align: 'center',
  padd: 1,
  column: true,
  gutter: 1.5,
  size: (s) => s * 1.3,
  justify: 'space-between',
})

const OptionsGroup = ctyled.div.styles({
  flex: 1,
  column: true,
  gutter: 1.7,
  align: 'center',
})

const DisableIcon = extend(
  Icon,
  ({ enabled }) => ({
    styles: {
      color: (c) => (enabled ? c : c.as(['#ff000080', '#ff000080'])),
    },
  }),
  { enabled: false }
)

export interface OptionsProps {
  onIncZoom: (diff: number) => void
  position: Types.Position
}

function ControlsOptions(props: OptionsProps) {
  const enabled = useSelector((state) => state.live.controlsEnabled),
    dispatch = useDispatch(),
    handleDisable = useCallback(() => dispatch(Actions.setControlsEnabled(null)), [
      enabled,
    ]),
    handleReplay = useResetScene(),
    handleClear = useCallback(() => dispatch(Actions.deleteControlGroup()), []),
    handleZoomIn = useCallback(() => props.onIncZoom(-1), [props.onIncZoom]),
    handleZoomOut = useCallback(() => props.onIncZoom(+1), [props.onIncZoom])

  return (
    <ControlsOptionsWrapper>
      <OptionsGroup>
        <Icon asButton name="zoom-in" onClick={handleZoomIn} />
        <Icon asButton name="zoom-out" onClick={handleZoomOut} />
        <DisableIcon
          asButton
          enabled={enabled}
          name={enabled ? 'volume' : 'volume_mute'}
          onClick={handleDisable}
          scale={0.8}
        />
        <Icon scale={1.1} asButton name="replay" onClick={handleReplay} />
      </OptionsGroup>
      <Icon scale={1.1} asButton name="close-thin" onClick={handleClear} />
    </ControlsOptionsWrapper>
  )
}

export default memo(ControlsOptions)
