import React, { memo, useMemo } from 'react'
import * as _ from 'lodash'
import ctyled, { inline } from 'ctyled'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import * as Types from 'render/util/types'

import { shortNames, getControlName } from './utils'
import Knob from './knob'
import Pad from './pad'

const GridCellWrapper = ctyled.div.attrs({ selected: false }).styles({
  align: 'center',
  justify: 'center',
  column: true,
  gutter: 0.5,
}).extendSheet`
  cursor:pointer;
  border-bottom:1px dashed ${({ color }) => color.bq};
  &:not(:last-child){
    border-right:1px dashed ${({ color }) => color.bq};
  }
  ${(_, { selected }) => selected && `background:#ff00000d;`}
  &:hover{
    background:${({ color }, { selected }) =>
      selected ? '#ff00000d' : color.nudge(0.05).bg};
  }
`

const CellMidi = ctyled.div.class(inline).styles({
  padd: 1,
  color: c => c.contrast(-0.2),
  bg: false,
  size: s => s * 0.85,
}).extendSheet`
  position:absolute;
  top:0;
  right:0;
`

const CellLabel = ctyled.div.styles({
  size: s => s * 0.6,
  width: '85%',
}).extendSheet`
  text-align:center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display: block;
`

export interface GridCellProps {
  x: number
  y: number
  selected: boolean
  onSelect: (pos: Types.Position) => any
  cellSize: number
}

const GridCell = memo((props: GridCellProps) => {
  const position: Types.Position = { x: props.x, y: props.y },
    getControlAtPos = useMemo(() => Selectors.makeGetControlAtPos(), []),
    getControlAbsValue = useMemo(() => Selectors.makeGetControlAbsValue(), []),
    getBindingAtPos = useMemo(() => Selectors.makeGetBindingAtPos(), []),
    [controlGroup, value] = useSelector(state => getControlAtPos(state, position)),
    absValue = useSelector(state =>
      getControlAbsValue(state, controlGroup && controlGroup.controls[0])
    ),
    binding = useSelector(state => getBindingAtPos(state, position)),
    initValue = useSelector(state =>
      Selectors.defaultValue(Selectors.getByPos(state.live.initValues, position))
    ),
    dispatch = useDispatch(),
    displayValue = (controlGroup && controlGroup.absolute ? absValue : value) || 0
  return (
    <GridCellWrapper
      selected={props.selected}
      onMouseDown={() => props.onSelect(position)}
      style={{ height: props.cellSize, width: props.cellSize }}
    >
      {binding && binding.note && (
        <CellMidi>{binding.note + shortNames[binding.function]}</CellMidi>
      )}
      {controlGroup && controlGroup.bindingType === 'value' && (
        <>
          <Knob
            center={
              controlGroup.absolute || (binding && binding.twoway)
                ? 0
                : initValue > 0.5
                ? 0
                : 1
            }
            value={displayValue}
            onChange={value =>
              dispatch(Actions.applyControlGroup(position, controlGroup, displayValue, value))
            }
          />
          <CellLabel>
            {controlGroup.name || controlGroup.controls.map(c => getControlName(c)).join(', ')}
          </CellLabel>
        </>
      )}
      {controlGroup && controlGroup.bindingType === 'note' && (
        <>
          <Pad
            value={displayValue}
            onChange={value =>
              dispatch(Actions.applyControlGroup(position, controlGroup, displayValue, value))
            }
          />
          <CellLabel>
            {controlGroup.name || controlGroup.controls.map(c => getControlName(c)).join(', ')}
          </CellLabel>
        </>
      )}
    </GridCellWrapper>
  )
})

export default GridCell
