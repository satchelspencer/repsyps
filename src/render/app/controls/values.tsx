import React, { memo } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'
import { SortableContainer, SortableElement, SortableHandle } from 'react-sortable-hoc'
import arrayMove from 'array-move'

import { useDispatch } from 'render/redux/react'
import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'
import mappings from 'render/util/mappings'

import Slider from 'render/components/slider'
import { TitleInner, ControlsProps } from './controls'
import { BindingController, BindingAdder } from './bindings'

const ValueControlWrapper = ctyled.div.attrs({ fixed: false }).styles({
  bg: true,
  width: 5,
  color: (c, { fixed }) => (fixed ? c.contrast(-0.1) : c.contrast(0.05)),
  borderColor: c => c.contrast(-0.175),
  column: true,
  lined: true,
}).extendSheet`
  height:100%;
  overflow:hidden;
  font-size:${({ size }) => size}px;
`

const ValueControlTitle = ctyled.div.styles({
  width: 1.3,
}).extendSheet`
  writing-mode: vertical-rl;
  text-orientation: mixed;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor:ew-resize;
`

const ValuesWrapper = ctyled.div.styles({
  flex: '1 0 0',
  column: true,
  lined: true,
  borderColor: c => c.contrast(-0.175),
}).extend`
overflow-x: scroll;
height: 100%;
`

const ValueControlsWrapper = ctyled.div.styles({
  flex: 1,
  lined: true,
  endLine: true,
  borderColor: c => c.contrast(-0.175),
}).extendSheet`min-width: max-content;`

const ValueControlBody = ctyled.div.styles({
  flex: 1,
  gutter: 1,
  padd: 2,
  justify: 'space-between',
})

const ValueBindings = ctyled.div.styles({
  lined: true,
  endLine: true,
  bg: true,
  bgColor: c => c.contrast(0.07),
  height: 2.5,
}).extendSheet`min-width: max-content;`

const ValueControlsSorter = SortableContainer<any>((props: any) => (
  <ValueControlsWrapper {...props} />
))

interface ValueControlProps {
  control: Types.ValueControl
  value: number
  lastOfPrev: boolean
}

const ValueHandle = SortableHandle((props: any) => <ValueControlTitle {...props} />)

const ValueControl = SortableElement((props: ValueControlProps) => {
  const dispatch = useDispatch()
  return (
    <ValueControlWrapper fixed={props.lastOfPrev}>
      <ValueControlBody>
        {!!props.control && (
          <>
            <Slider
              column
              value={props.value}
              onChange={value =>
                dispatch(
                  Actions.applyControl({
                    control: props.control,
                    value: mappings[props.control.prop].fromStandard(value),
                    function: 'control',
                  })
                )
              }
            />
            <ValueHandle>
              <TitleInner>{props.control.name}</TitleInner>
            </ValueHandle>
          </>
        )}
      </ValueControlBody>
    </ValueControlWrapper>
  )
})

const ValueControls = memo((props: ControlsProps) => {
  const dispatch = useDispatch(),
    { controls, bindings, values, lastOfPrevIds } = props,
    corbs = _.values({ ...controls, ...bindings }),
    maxValueX =
      _.max(corbs.filter(corb => corb.type === 'value').map(c => c.position.x + 1)) || 0,
    valueControlIds = _.range(maxValueX).map(x => {
      return _.find(
        _.keys(controls),
        controlId =>
          controls[controlId].position.x === x && controls[controlId].type === 'value'
      )
    })
  return (
    <ValuesWrapper>
      <ValueBindings>
        {_.range(maxValueX).map(x => (
          <BindingController key={x} x={x} bindings={bindings} type="value" />
        ))}
        <BindingAdder x={maxValueX} type="value" />
      </ValueBindings>
      <ValueControlsSorter
        axis="x"
        lockAxis="x"
        useDragHandle
        lockToContainerEdges
        onSortEnd={({ oldIndex, newIndex }) => {
          const newValueControlIds = arrayMove(valueControlIds, oldIndex, newIndex)
          lastOfPrevIds.forEach(controlId => {
            const properIndex = valueControlIds.indexOf(controlId),
              currentAtProperIndex = newValueControlIds[properIndex],
              currentIndex = newValueControlIds.indexOf(controlId)
            if (properIndex !== -1 && currentAtProperIndex !== controlId) {
              newValueControlIds[properIndex] = controlId
              newValueControlIds[currentIndex] = undefined
              if (currentAtProperIndex) {
                newValueControlIds[
                  newValueControlIds.findIndex(v => v === undefined)
                ] = currentAtProperIndex
              }
            }
          })
          newValueControlIds.forEach((controlId, newX) => {
            if (
              controlId &&
              !lastOfPrevIds.includes(controlId) &&
              valueControlIds.indexOf(controlId) !== newX
            ) {
              dispatch(Actions.setControlPos({ controlId, position: { x: newX } }))
            }
          })
        }}
        distance={5}
        transitionDuration={0}
      >
        {valueControlIds.map((controlId, x) => {
          const control = controls[controlId] as Types.ValueControl
          return (
            <ValueControl
              lastOfPrev={lastOfPrevIds.includes(controlId)}
              index={x}
              key={x}
              control={control}
              value={values[controlId]}
            />
          )
        })}
      </ValueControlsSorter>
    </ValuesWrapper>
  )
})

export default ValueControls
