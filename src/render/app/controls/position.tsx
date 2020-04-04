import React, { memo } from 'react'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'

import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import * as Types from 'render/util/types'

import { useSelector, useDispatch } from 'render/redux/react'
import { useSelection } from 'render/components/selection'
import {
  WideButton,
  SelectableButton,
  HeaderContent,
  SidebarValue,
} from 'render/components/misc'
import Icon from 'render/components/icon'
import SidebarItem from 'render/components/item'

import { shortNames, getControlName, getDefaultBindingType, getIcon } from './utils'

const ControlSelectableButton = SelectableButton.styles({
  color: (c, { selected }) => (selected ? c.nudge(0.05) : c.contrast(-0.2)),
})

const ControlInspector = ctyled.div.styles({
  width: 20,
  column: true,
  lined: true,
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

const ControlBloc = ctyled.div.class(active).styles({
  gutter: 1,
  flex: 1,
  bg: true,
  color: c => c.nudge(0.05),
  border: 1,
  borderColor: c => c.contrast(-0.1),
  padd: 1,
  height: 1.75,
  align: 'center',
  rounded: true,
  hover: 0.1,
})

const ControlWrapper = ctyled.div.styles({
  gutter: 1,
  align: 'center',
})

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
  color: c => c.nudge(-0.05),
  gutter: 1,
  align: 'center',
  bg: true,
  padd: 1,
})

export interface ControlDetailProps {
  position: Types.Position
}

function PositionDetail(props: ControlDetailProps) {
  const selectedControlGroup = useSelector(state =>
      Selectors.getByPos(Selectors.getControls(state.live), props.position)
    ),
    selectedBinding = useSelector(state =>
      Selectors.getByPos(state.live.bindings, props.position)
    ),
    dispatch = useDispatch()

  const { getSelection, isSelecting } = useSelection<Types.Control>('control')

  const shouldStartWaiting = !selectedBinding || !selectedBinding.waiting

  return (
    <ControlInspector>
      {props.position && (
        <>
          <MidiWrapper>
            <HeaderContent>
              <Icon name="midi" />
            </HeaderContent>
            <WideButton
              styles={{ flex: 1 }}
              onClick={() => {
                dispatch(
                  Actions.setBinding({
                    position: props.position,
                    binding: {
                      type: 'value',
                      waiting: shouldStartWaiting,
                    },
                  })
                )
              }}
            >
              {shouldStartWaiting ? (
                <>
                  <Icon name="eyedropper" />
                  &nbsp;Set Midi
                </>
              ) : (
                <>Waiting...</>
              )}
            </WideButton>
            <ControlBloc
              styles={{ flex: 'none' }}
              style={{
                opacity: selectedBinding && selectedBinding.twoway ? 1 : 0.5,
              }}
              onClick={() => {
                if (selectedBinding)
                  dispatch(
                    Actions.setBinding({
                      position: props.position,
                      binding: {
                        twoway: !selectedBinding.twoway,
                      },
                    })
                  )
              }}
            >
              <Icon styles={{ size: s => s * 1.1 }} name="twoway" />
            </ControlBloc>
            <SidebarValue>
              {selectedBinding && selectedBinding.note
                ? selectedBinding.note + shortNames[selectedBinding.function]
                : '--'}
            </SidebarValue>
            <Icon
              style={{ opacity: selectedBinding ? 1 : 0.3 }}
              onClick={() => dispatch(Actions.removeBinding(props.position))}
              asButton
              name="close"
            />
          </MidiWrapper>
          <ControlInspectorBody>
            <BodyInner>
              {selectedControlGroup && (
                <>
                  <SidebarItem
                    title={
                      <>
                        <ControlSelectableButton
                          onClick={() =>
                            dispatch(
                              Actions.setControlGroup({
                                position: props.position,
                                controlGroup: {
                                  absolute: true,
                                },
                              })
                            )
                          }
                          selected={selectedControlGroup.absolute}
                        >
                          {selectedControlGroup.absolute && <Icon name="check" />}
                          Absolute
                        </ControlSelectableButton>
                        <ControlSelectableButton
                          onClick={() =>
                            dispatch(
                              Actions.setControlGroup({
                                position: props.position,
                                controlGroup: {
                                  absolute: false,
                                },
                              })
                            )
                          }
                          selected={!selectedControlGroup.absolute}
                        >
                          {!selectedControlGroup.absolute && <Icon name="check" />}
                          Relative
                        </ControlSelectableButton>
                      </>
                    }
                  />
                  <SidebarItem
                    title={
                      <>
                        <HeaderContent>Control</HeaderContent>
                        <ControlSelectableButton
                          onClick={() =>
                            dispatch(
                              Actions.setControlGroup({
                                position: props.position,
                                controlGroup: {
                                  bindingType: 'value',
                                },
                              })
                            )
                          }
                          selected={selectedControlGroup.bindingType === 'value'}
                        >
                          <Icon name="knob" />
                          &nbsp;Fader
                        </ControlSelectableButton>
                        <ControlSelectableButton
                          onClick={() =>
                            dispatch(
                              Actions.setControlGroup({
                                position: props.position,
                                controlGroup: {
                                  bindingType: 'note',
                                },
                              })
                            )
                          }
                          selected={selectedControlGroup.bindingType === 'note'}
                        >
                          <Icon name="pad" />
                          &nbsp;Pad
                        </ControlSelectableButton>
                      </>
                    }
                  />
                </>
              )}
              {selectedControlGroup &&
                selectedControlGroup.controls.map((control, index) => {
                  const icon = getIcon(control),
                    isIgnored = index > 0 && selectedControlGroup.absolute
                  return (
                    <ControlWrapper style={{ opacity: isIgnored ? 0.5 : 1 }} key={index}>
                      <ControlBloc styles={{ bg: false }}>
                        {icon && <Icon styles={{ size: s => s * 1.1 }} name={icon} />}
                        <ControlNameWrapper>
                          <ControlNameInner>{getControlName(control)}</ControlNameInner>
                        </ControlNameWrapper>
                      </ControlBloc>
                      {!selectedControlGroup.absolute && (
                        <ControlBloc
                          styles={{ flex: '0' }}
                          onClick={() => {
                            const newControls = [...selectedControlGroup.controls]
                            newControls[index] = {
                              ...newControls[index],
                              invert: !control.invert,
                            }
                            dispatch(
                              Actions.setControlGroup({
                                position: props.position,
                                controlGroup: {
                                  controls: newControls,
                                },
                              })
                            )
                          }}
                        >
                          <Icon
                            styles={{ size: s => s * 1.1 }}
                            name={control.invert ? 'down' : 'up'}
                          />
                        </ControlBloc>
                      )}
                      <Icon
                        asButton
                        name="close"
                        onClick={() => {
                          if (selectedControlGroup.controls.length > 1) {
                            const newControls = [...selectedControlGroup.controls]
                            newControls.splice(index, 1)
                            dispatch(
                              Actions.setControlGroup({
                                position: props.position,
                                controlGroup: {
                                  controls: newControls,
                                },
                              })
                            )
                          } else
                            dispatch(
                              Actions.deleteControlGroup({ position: props.position })
                            )
                        }}
                      />
                    </ControlWrapper>
                  )
                })}
              {props.position && (
                <WideButton
                  disabled={selectedControlGroup && selectedControlGroup.absolute}
                  onClick={async () => {
                    const control = await getSelection()
                    if (!control) return
                    const currentControls = selectedControlGroup
                        ? selectedControlGroup.controls
                        : [],
                      currentType =
                        selectedControlGroup && selectedControlGroup.bindingType,
                      type = currentType || getDefaultBindingType(control)

                    dispatch(
                      Actions.setControlGroup({
                        position: props.position,
                        controlGroup: {
                          absolute: 'globalProp' in control,
                          bindingType: type,
                          position: props.position,
                          controls: [...currentControls, control],
                        },
                      })
                    )
                  }}
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

export default memo(PositionDetail)
