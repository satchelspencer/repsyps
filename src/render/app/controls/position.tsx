import React, { memo, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'

import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import * as Types from 'render/util/types'

import { useSelector, useDispatch } from 'render/redux/react'
import { useSelection } from 'render/components/selection'
import {
  WideButton,
  FillButton,
  SelectableButton,
  HeaderContent,
  SidebarValue,
  Horizontal,
} from 'render/components/misc'
import Icon from 'render/components/icon'

import { midiName, getControlName, getIcon } from './utils'
import { defaultBinding } from 'src/render/redux/defaults'

const ControlSelectableButton = SelectableButton.styles({
  color: (c, { selected }) =>
    c.serial().inverted
      ? selected
        ? c.nudge(0.1).contrast(0.1)
        : c
      : selected
      ? c.nudge(0.05)
      : c.contrast(-0.2),
})

const ControlInspector = ctyled.div.styles({
  width: 23,
  column: true,
  lined: true,
  bg: true,
})

const ControlInspectorBody = ctyled.div.styles({
  flex: 1,
})

const BodyInner = ctyled.div.styles({
  padd: 1,
  column: true,
  gutter: 1,
  scroll: true,
}).extendSheet`
  position:absolute;
  top:0;
  left:0;
  right:0;
  bottom:0;
`

const ControlBloc = ctyled.div
  .class(active)
  .attrs<{ compact?: boolean }>({ compact: false })
  .styles({
    gutter: 1,
    flex: (_, { compact }) => (compact ? 'none' : 1),
    bg: true,
    color: (c) => c.nudge(0.05),
    border: 1,
    borderColor: (c) => c.contrast(-0.1),
    padd: 1,
    height: 1.75,
    align: 'center',
    rounded: true,
    hover: 0.1,
  })

const ControlWrapper = ctyled.div.attrs({ ignored: false }).styles({
  gutter: 1,
  align: 'center',
}).extendInline`
  ${(_, { ignored }) => ignored && `opacity:0.5;`}
`

const ControlNameWrapper = ctyled.div.styles({ flex: 1, height: 1.3 })

const ControlNameInner = ctyled.div.styles({}).extendSheet`
  position:absolute;
  top:0;
  left:0;
  right:0;
  bottom:0;
  display:block;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
`

const MidiWrapper = ctyled.div.styles({
  color: (c) => c.nudge(-0.05),
  gutter: 1,
  align: 'center',
  bg: true,
  padd: 1,
})

const MCPButton = ControlBloc.extendSheet`
  font-size:${({ size }) => size * 0.6}px;
`

export interface ControlDetailProps {
  position: Types.Position
}

function PositionDetail(props: ControlDetailProps) {
  const selectedControlGroup = useSelector((state) =>
      Selectors.getByPos(Selectors.getControls(state), props.position)
    ),
    selectedBinding = useSelector((state) =>
      Selectors.getByPos(state.live.bindings, props.position)
    ),
    binding = selectedBinding || defaultBinding,
    isGlobal = useSelector(
      (state) => !!Selectors.getByPos(state.live.globalControls, props.position)
    ),
    dispatch = useDispatch()

  const { getSelection, isSelecting } = useSelection<Types.Control>('control'),
    shouldStartWaiting = !selectedBinding || !selectedBinding.waiting

  const addMidiBinding = useCallback(() => {
      dispatch(
        Actions.setBinding({
          binding: {
            waiting: shouldStartWaiting,
          },
        })
      )
    }, [shouldStartWaiting]),
    toggleTwoWay = useCallback(() => {
      dispatch(Actions.setBinding({ binding: { twoway: !binding.twoway } }))
    }, [binding.twoway]),
    toggleMCP = useCallback(() => {
      dispatch(Actions.setBinding({ binding: { mcp: !binding.mcp } }))
    }, [binding.mcp]),
    removeMidiBinding = useCallback(() => dispatch(Actions.removeBinding()), []),
    setAbsolute = useCallback(
      () => dispatch(Actions.setControlGroup({ controlGroup: { absolute: true } })),
      []
    ),
    setRelative = useCallback(
      () => dispatch(Actions.setControlGroup({ controlGroup: { absolute: false } })),
      []
    ),
    setAsValue = useCallback(
      () => dispatch(Actions.setControlGroup({ controlGroup: { bindingType: 'value' } })),
      []
    ),
    setAsNote = useCallback(
      () => dispatch(Actions.setControlGroup({ controlGroup: { bindingType: 'note' } })),
      []
    ),
    setAsJog = useCallback(
      () => dispatch(Actions.setControlGroup({ controlGroup: { bindingType: 'jog' } })),
      []
    ),
    handleAddControl = useCallback(async () => {
      const control = await getSelection()
      if (!control) return
      dispatch(Actions.addControlToGroup({ control }))
    }, []),
    toggleGlobal = useCallback(() => {
      dispatch(
        Actions.setControlPosGlobal({
          position: props.position,
          global: !isGlobal,
        })
      )
    }, [isGlobal, props.position])

  return (
    <ControlInspector>
      {props.position && (
        <>
          <MidiWrapper>
            <ControlBloc compact onClick={toggleGlobal}>
              <Icon scale={1.1} name={isGlobal ? 'lock' : 'lock-open'} />
            </ControlBloc>
            <FillButton onClick={addMidiBinding}>
              {shouldStartWaiting ? (
                <>
                  <Icon name="midi" scale={0.9} />
                  &nbsp;Set Midi
                </>
              ) : (
                'Waiting...'
              )}
            </FillButton>
            <ControlBloc compact onClick={toggleTwoWay}>
              <Icon scale={1.1} name={binding.twoway ? 'twoway' : 'oneway'} />
            </ControlBloc>
            <MCPButton compact onClick={toggleMCP}>
              <Icon name={binding.mcp ? 'check' : 'pad'} scale={0.7} />
              &nbsp;MCP
            </MCPButton>
            <SidebarValue>{binding.midi ? midiName(binding.midi) : '--'}</SidebarValue>
            <Icon
              disabled={!selectedBinding}
              onClick={removeMidiBinding}
              asButton
              name="close"
            />
          </MidiWrapper>
          <ControlInspectorBody>
            <BodyInner>
              {selectedControlGroup && (
                <>
                  <Horizontal>
                    <ControlSelectableButton
                      onClick={setAbsolute}
                      selected={selectedControlGroup.absolute}
                    >
                      {selectedControlGroup.absolute && <Icon name="check" />}
                      Absolute
                    </ControlSelectableButton>
                    <ControlSelectableButton
                      onClick={setRelative}
                      selected={!selectedControlGroup.absolute}
                    >
                      {!selectedControlGroup.absolute && <Icon name="check" />}
                      Relative
                    </ControlSelectableButton>
                  </Horizontal>
                  <Horizontal>
                    <ControlSelectableButton
                      onClick={setAsValue}
                      selected={selectedControlGroup.bindingType === 'value'}
                    >
                      <Icon name="knob" />
                      &nbsp;Fader
                    </ControlSelectableButton>
                    <ControlSelectableButton
                      onClick={setAsNote}
                      selected={selectedControlGroup.bindingType === 'note'}
                    >
                      <Icon name="pad" />
                      &nbsp;Pad
                    </ControlSelectableButton>
                    <ControlSelectableButton
                      onClick={setAsJog}
                      selected={selectedControlGroup.bindingType === 'jog'}
                    >
                      <Icon name="jog" />
                      &nbsp;Jog
                    </ControlSelectableButton>
                  </Horizontal>
                </>
              )}
              {selectedControlGroup &&
                selectedControlGroup.controls.map((control, index) => {
                  return (
                    <Control
                      key={index}
                      control={control}
                      index={index}
                      group={selectedControlGroup}
                      position={props.position}
                    />
                  )
                })}
              {props.position && (
                <WideButton
                  disabled={selectedControlGroup && selectedControlGroup.absolute}
                  onClick={handleAddControl}
                >
                  {isSelecting ? (
                    <>Select A Control...</>
                  ) : (
                    <>
                      <Icon name="add" />
                      &nbsp;Add Control
                    </>
                  )}
                </WideButton>
              )}
            </BodyInner>
          </ControlInspectorBody>
        </>
      )}
    </ControlInspector>
  )
}

interface ControlProps {
  control: Types.Control
  index: number
  group: Types.ControlGroup
  position: Types.Position
}

const Control = memo((props: ControlProps) => {
  const dispatch = useDispatch(),
    icon = getIcon(props.control),
    isIgnored = props.index > 0 && props.group.absolute,
    toggleInvert = useCallback(() => {
      const newControls = [...props.group.controls]
      newControls[props.index] = {
        ...newControls[props.index],
        invert: !props.control.invert,
      }
      dispatch(
        Actions.setControlGroup({
          controlGroup: {
            controls: newControls,
          },
        })
      )
    }, [props.position, props.group.controls, props.index, props.control.invert]),
    removeControl = useCallback(() => {
      if (props.group.controls.length > 1) {
        const newControls = [...props.group.controls]
        newControls.splice(props.index, 1)
        dispatch(
          Actions.setControlGroup({
            controlGroup: {
              controls: newControls,
            },
          })
        )
      } else dispatch(Actions.deleteControlGroup())
    }, [props.group.controls, props.index])

  return (
    <ControlWrapper ignored={isIgnored}>
      <ControlBloc>
        {icon && <Icon scale={1.1} name={icon} />}
        <ControlNameWrapper>
          <ControlNameInner>{getControlName(props.control)}</ControlNameInner>
        </ControlNameWrapper>
      </ControlBloc>
      {!props.group.absolute && (
        <ControlBloc compact onClick={toggleInvert}>
          <Icon scale={1.1} name={props.control.invert ? 'down' : 'up'} />
        </ControlBloc>
      )}
      <Icon asButton name="close" onClick={removeControl} />
    </ControlWrapper>
  )
})

export default memo(PositionDetail)
