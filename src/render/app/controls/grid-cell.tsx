import React, { memo, useMemo, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled, { inline } from 'ctyled'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import * as Types from 'render/util/types'

import Icon from 'render/components/icon'
import { midiName, getControlName } from './utils'
import Knob from './knob'
import Pad from './pad'
import Jog from './jog'

const CellMidi = ctyled.div.class(inline).styles({
  padd: 1,
  color: (c) => c.contrast(-0.2),
  bg: false,
  size: (s) => s * 0.75,
}).extendSheet`
  position:absolute;
  top:0;
  right:0;
`

const CellTL = CellMidi.extend`
  left: 0;
  right: initial;
`

const CellLabel = ctyled.div.styles({
  size: (s) => s * 0.6,
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
}

const GridCell = memo((props: GridCellProps) => {
  const position: Types.Position = { x: props.x, y: props.y },
    getControlAtPos = useMemo(() => Selectors.makeGetControlAtPos(), []),
    getControlAbsValue = useMemo(() => Selectors.makeGetControlAbsValue(), []),
    getBindingAtPos = useMemo(() => Selectors.makeGetBindingAtPos(), []),
    [control, value] = useSelector((state) => getControlAtPos(state, position)),
    isGlobal = useSelector(
      (state) => !!Selectors.getByPos(state.live.globalControls, position)
    ),
    absValue = useSelector(
      (state) => control && getControlAbsValue(state, control.controls[0])
    ),
    normAbsValue = absValue === null ? value : absValue,
    binding = useSelector((state) => getBindingAtPos(state, position)),
    initValue = useSelector((state) =>
      Selectors.defaultValue(
        Selectors.getByPos(Selectors.getCurrentInitValues(state), position)
      )
    ),
    dispatch = useDispatch(),
    displayValue = (control && control.absolute ? normAbsValue : value) || 0,
    handleChange = useCallback(
      (value) =>
      control && dispatch(Actions.applyControlGroup(position, control, displayValue, value)),
      [position, control, displayValue, value]
    )

  return (
    <>
      {binding && binding.midi !== null && <CellMidi>{midiName(binding.midi)}</CellMidi>}
      {isGlobal && (
        <CellTL>
          <Icon name="lock" />
        </CellTL>
      )}
      {control && control.bindingType === 'value' && (
        <>
          <Knob
            center={
              control.absolute || (binding && binding.twoway)
                ? 0
                : initValue > 0.5
                ? 0
                : 1
            }
            badMidiValue={binding && binding.badMidiValue ? binding.lastMidiValue : null}
            value={displayValue}
            onChange={handleChange}
          />
          <CellLabel>
            {control.name || control.controls.map((c) => getControlName(c)).join(', ')}
          </CellLabel>
        </>
      )}
      {control && control.bindingType === 'note' && (
        <>
          <Pad value={displayValue} onChange={handleChange} />
          <CellLabel>
            {control.name || control.controls.map((c) => getControlName(c)).join(', ')}
          </CellLabel>
        </>
      )}
      {control && control.bindingType === 'jog' && (
        <>
          <Jog value={displayValue} onChange={handleChange} />
          <CellLabel>
            {control.name || control.controls.map((c) => getControlName(c)).join(', ')}
          </CellLabel>
        </>
      )}
    </>
  )
})

export default GridCell
