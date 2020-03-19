import React, { memo, useState, useRef, useEffect, useContext, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled, { CtyledContext, active } from 'ctyled'

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

import GridCell from './cell'
import { shortNames, getControlName, getDefaultBindingType, getIcon } from './utils'
import isEqual from 'src/render/util/is-equal'

const ControlSelectableButton = SelectableButton.styles({
  color: (c, { selected }) => (selected ? c.nudge(0.05) : c.contrast(-0.2)),
})

const ControlsGridWrapper = ctyled.div.styles({
  flex: 1,
  color: c => c.nudge(0.05),
  bg: true,
}).extendSheet`
  overflow:hidden;
  border-left:1px solid ${({ color }) => color.bq} !important;
`

const GridInner = ctyled.div.styles({
  column: true,
}).extendSheet`
  position:absolute;
  top:0;
  left:0;
  width:100%;
  height:100%;
  outline:none;
`

const ControlInspector = ctyled.div.styles({
  width: 20,
  column: true,
  padd: 1,
  gutter: 1,
})

const GridRow = ctyled.div.styles({})

const ControlsH = ctyled.div.styles({ flex: 1, width: '100%' })

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

function ControlsGrid() {
  const controls = useSelector(state => Selectors.getControls(state.live)),
    bindings = useSelector(state => state.live.bindings),
    dispatch = useDispatch(),
    [width, setWidth] = useState(0),
    [height, setHeight] = useState(0),
    [selected, setSelected] = useState<Types.ControlPosition>(null),
    selectedControl = Selectors.getByPos(controls, selected),
    selectedBinding = Selectors.getByPos(bindings, selected),
    grid = useRef(null),
    handleResize = useCallback(() => {
      setWidth(grid.current.offsetWidth)
      setHeight(grid.current.offsetHeight)
    }, [])

  useEffect(() => {
    function handleResize() {
      setWidth(grid.current.offsetWidth)
      setHeight(grid.current.offsetHeight)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const targetWidth = useContext(CtyledContext).theme.size * 8,
    count = Math.ceil(width / targetWidth),
    cellSize = width / count,
    rowCount = Math.ceil(height / cellSize)

  const { getSelection, isSelecting } = useSelection<Types.Control>('control')

  const shouldStartWaiting = !selectedBinding || !selectedBinding.waiting

  return (
    <ControlsH>
      <ControlInspector>
        {selected && (
          <>
            <SidebarItem
              title={
                <>
                  <HeaderContent>
                    <Icon name="midi" />
                  </HeaderContent>
                  <WideButton
                    styles={{ flex: 1 }}
                    onClick={() => {
                      dispatch(
                        Actions.setBinding({
                          position: selected,
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
                            position: selected,
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
                    onClick={() => dispatch(Actions.removeBinding(selected))}
                    asButton
                    name="close"
                  />
                </>
              }
            />
            {selectedControl && (
              <>
                <SidebarItem
                  title={
                    <>
                      <ControlSelectableButton
                        onClick={() =>
                          dispatch(
                            Actions.setControlGroup({
                              position: selected,
                              controlGroup: {
                                absolute: true,
                              },
                            })
                          )
                        }
                        selected={selectedControl.absolute}
                      >
                        {selectedControl.absolute && <Icon name="check" />}
                        Absolute
                      </ControlSelectableButton>
                      <ControlSelectableButton
                        onClick={() =>
                          dispatch(
                            Actions.setControlGroup({
                              position: selected,
                              controlGroup: {
                                absolute: false,
                              },
                            })
                          )
                        }
                        selected={!selectedControl.absolute}
                      >
                        {!selectedControl.absolute && <Icon name="check" />}
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
                              position: selected,
                              controlGroup: {
                                bindingType: 'value',
                              },
                            })
                          )
                        }
                        selected={selectedControl.bindingType === 'value'}
                      >
                        <Icon name="knob" />
                        &nbsp;Fader
                      </ControlSelectableButton>
                      <ControlSelectableButton
                        onClick={() =>
                          dispatch(
                            Actions.setControlGroup({
                              position: selected,
                              controlGroup: {
                                bindingType: 'note',
                              },
                            })
                          )
                        }
                        selected={selectedControl.bindingType === 'note'}
                      >
                        <Icon name="pad" />
                        &nbsp;Pad
                      </ControlSelectableButton>
                    </>
                  }
                />
              </>
            )}
          </>
        )}
        {selectedControl &&
          selectedControl.controls.map((control, index) => {
            const icon = getIcon(control)
            return (
              <ControlWrapper key={index}>
                <ControlBloc styles={{ bg: false }}>
                  {icon && <Icon styles={{ size: s => s * 1.1 }} name={icon} />}
                  <ControlNameWrapper>
                    <ControlNameInner>{getControlName(control)}</ControlNameInner>
                  </ControlNameWrapper>
                </ControlBloc>
                {!selectedControl.absolute && (
                  <ControlBloc
                    styles={{ flex: '0' }}
                    onClick={() => {
                      const newControls = [...selectedControl.controls]
                      newControls[index] = {
                        ...newControls[index],
                        invert: !control.invert,
                      }
                      dispatch(
                        Actions.setControlGroup({
                          position: selected,
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
                    if (selectedControl.controls.length > 1) {
                      const newControls = [...selectedControl.controls]
                      newControls.splice(index, 1)
                      dispatch(
                        Actions.setControlGroup({
                          position: selected,
                          controlGroup: {
                            controls: newControls,
                          },
                        })
                      )
                    } else dispatch(Actions.deleteControlGroup({ position: selected }))
                  }}
                />
              </ControlWrapper>
            )
          })}
        {selected && (
          <WideButton
            disabled={selectedControl && selectedControl.absolute}
            onClick={async () => {
              const control = await getSelection(),
                currentControls = selectedControl ? selectedControl.controls : [],
                currentType = selectedControl && selectedControl.bindingType,
                type = currentType || getDefaultBindingType(control)

              dispatch(
                Actions.setControlGroup({
                  position: selected,
                  controlGroup: {
                    bindingType: type,
                    position: selected,
                    controls: [...currentControls, control],
                  },
                })
              )
            }}
          >
            {isSelecting ? (
              'Select A Control...'
            ) : (
              <>
                <Icon name="add" />
                &nbsp;Add Control
              </>
            )}
          </WideButton>
        )}
      </ControlInspector>
      <ControlsGridWrapper>
        <GridInner
          tabIndex={-1}
          onKeyDown={e => {
            console.log(e.key)
          }}
          inRef={r => {
            if (r) {
              grid.current = r
              if (!width) handleResize()
            }
          }}
        >
          {_.range(rowCount).map(y => {
            return (
              <GridRow key={y}>
                {_.range(count).map(x => {
                  const pos = { x, y }
                  return (
                    <GridCell
                      key={x}
                      cellSize={cellSize}
                      x={x}
                      y={y}
                      selected={isEqual(pos, selected)}
                      onSelect={() => setSelected(pos)}
                    />
                  )
                })}
              </GridRow>
            )
          })}
        </GridInner>
      </ControlsGridWrapper>
    </ControlsH>
  )
}

export default memo(ControlsGrid)
