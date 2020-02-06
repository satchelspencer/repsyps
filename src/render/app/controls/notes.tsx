import React, { memo } from 'react'
import { useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'
import { SortableContainer, SortableElement } from 'react-sortable-hoc'
import arrayMove from 'array-move'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'

import { ControlsProps } from './controls'
import { BindingController, BindingAdder } from './bindings'

const NotesWrapper = ctyled.div.styles({
  flex: '0.75 0 0',
  lined: true,
}).extendSheet`
  border-left:2px solid ${({ color }) => color.bq} !important;
  overflow-y:scroll;
  height: 100%;
`

const NoteControlsWrapper = ctyled.div.styles({
  column: true,
  lined: true,
  endLine: true,
  borderColor: c => c.contrast(-0.2),
  flex: 1,
}).extendSheet`min-height: max-content;`

const NoteBindings = ctyled.div.styles({
  lined: true,
  endLine: true,
  bg: true,
  column: true,
  bgColor: c => c.contrast(0.07),
  width: 5,
}).extendSheet`min-height: max-content;`

const NoteControlWrapper = ctyled.div.styles({
  height: 2.5,
  color: c => c.contrast(0.1),
}).extendSheet`
  font-size:${({ size }) => size}px;
`

const NoteControlInner = ctyled.div.class(active).styles({
  bg: true,
  align: 'center',
  padd: 1.5,
  gutter: 1.5,
  hover: true,
  flex: 1,
})

const NoteControlName = ctyled.div.styles({
  flex: 1,
  height: 1.4,
})

const NameInner = ctyled.div.styles({
  flex: 'none',
}).extendSheet`
position:absolute;
width:100%;
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
    display: block;
`

const NoteControlPad = ctyled.div.styles({
  bg: true,
  rounded: 2,
  color: c => c.nudge(0.15),
  width: 1.5,
  height: 1.5,
  border: true,
  borderColor: c => c.contrast(-0.2),
})

const NoteControlsSorter = SortableContainer<any>((props: any) => (
  <NoteControlsWrapper {...props} />
))

interface NoteControlProps {
  control: Types.NoteControl
}

const NoteControl = SortableElement((props: NoteControlProps) => {
  const dispatch = useDispatch()
  return (
    <NoteControlWrapper>
      {props.control && (
        <NoteControlInner
          onClick={() =>
            dispatch(
              Actions.applyControl({
                control: props.control,
                value: 127,
                function: 'note-on',
              })
            )
          }
        >
          <NoteControlPad />
          <NoteControlName>
            <NameInner>{props.control.name}</NameInner>
          </NoteControlName>
        </NoteControlInner>
      )}
    </NoteControlWrapper>
  )
})

const NoteControls = memo((props: ControlsProps) => {
  const dispatch = useDispatch(),
    { controls, bindings } = props,
    corbs = _.values({ ...controls, ...bindings }),
    maxNoteX =
      _.max(corbs.filter(corb => corb.type === 'note').map(c => c.position.x + 1)) || 0,
    noteControlIds = _.range(maxNoteX).map(x => {
      return _.find(
        _.keys(controls),
        controlId =>
          controls[controlId].position.x === x && controls[controlId].type === 'note'
      )
    })

  return (
    <NotesWrapper>
      <NoteControlsSorter
        axis="y"
        lockAxis="y"
        lockToContainerEdges
        onSortEnd={({ oldIndex, newIndex }) => {
          arrayMove(noteControlIds, oldIndex, newIndex).forEach((controlId, newX) => {
            if (controlId)
              dispatch(Actions.setControlPos({ controlId, position: { x: newX } }))
          })
        }}
        distance={5}
        transitionDuration={0}
      >
        {noteControlIds.map((controlId, x) => {
          return (
            <NoteControl
              key={x}
              index={x}
              control={controls[controlId] as Types.NoteControl}
            />
          )
        })}
      </NoteControlsSorter>
      <NoteBindings>
        {_.range(maxNoteX).map(x => (
          <BindingController key={x} x={x} bindings={bindings} type="note" />
        ))}
        <BindingAdder x={maxNoteX} type="note" />
      </NoteBindings>
    </NotesWrapper>
  )
})

export default NoteControls
