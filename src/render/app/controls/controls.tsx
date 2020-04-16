import React, { memo, useState, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'

import SceneControl from './scene'
import ControlsGrid from './grid'
import ResizableBorder from 'render/components/rborder'

const ControlsWrapper = ctyled.div.attrs({ heightp: 35 }).styles({
  height: (_, { heightp }) => heightp + '%',
  bg: true,
  column: true,
  lined: true,
}).extendSheet`
  height:100%;
`

export interface ControlsProps {
  bodyHeight: number
}

const clip = (size: number) => Math.min(Math.max(size, 10), 90)

function ControlsContainer(props: ControlsProps) {
  const dispatch = useDispatch(),
    controlsSize = useSelector((state) => clip(state.settings.controlsSize || 35)),
    [offset, setOffset] = useState(0),
    handleMove = useCallback(
      (delta) => {
        const deltaPer = ((-1 * delta) / props.bodyHeight) * 100
        setOffset(offset + deltaPer)
      },
      [props.bodyHeight, controlsSize]
    ),
    handleCommit = useCallback(
      (delta) => {
        const deltaPer = ((-1 * delta) / props.bodyHeight) * 100
        setOffset(0)
        dispatch(
          Actions.setSettings({
            controlsSize: clip(controlsSize + offset + deltaPer),
          })
        )
      },
      [props.bodyHeight, controlsSize]
    )

  return (
    <ControlsWrapper heightp={clip(controlsSize + offset)}>
      <ResizableBorder
        onCommit={handleCommit}
        onMove={handleMove}
        vertical={true}
        start={true}
      />
      <SceneControl />
      <ControlsGrid />
    </ControlsWrapper>
  )
}

export default memo(ControlsContainer)
