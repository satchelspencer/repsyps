import React, {
  memo,
  useState,
  useRef,
  useEffect,
  useContext,
  useCallback,
  useMemo,
} from 'react'
import * as _ from 'lodash'
import ctyled, { CtyledContext } from 'ctyled'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'

import useMeasure from 'render/components/measure'
import GridCell from './grid-cell'
import PositionDetail from './position'
import ControlsOptions from './options'
import Presets from './presets'
import Levels from './level'
import isEqual from 'src/render/util/is-equal'

const ControlsGridWrapper = ctyled.div.attrs({ enabled: true }).styles({
  flex: 1,
  bg: true,
  color: (c) => c.nudge(0.05),
  disabled: (_, { enabled }) => !enabled,
})

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
const GridRow = ctyled.div.styles({})

const GridCellWrapper = ctyled.div
  .attrs({ selected: false, exited: false, cellSize: 0, isGlobal: false })
  .styles({
    align: 'center',
    justify: 'center',
    column: true,
    gutter: 0.5,
    size: (size, { cellSize }) => cellSize / 8,
  }).extendSheet`
  cursor:pointer;
  border-bottom:1px dashed ${({ color }) => color.bq};
  &:not(:last-child){
    border-right:1px dashed ${({ color }) => color.bq};
  }
  ${({ color }, { isGlobal }) => isGlobal && `background:${color.nudge(0.085).bg};`}
  ${(_, { selected, isGlobal }) =>
    selected && `background:${isGlobal ? '#ff00000d' : '#ff00000d'};`}
  &:hover{
    background:${({ color }, { selected, exited }) =>
      exited ? 'inherit' : selected ? '#ff00000d' : color.nudge(0.05).bg};
    ${(_, { exited }) => exited && `box-shadow:0 0 2px 5px inset #ff000012;`}
  }
`.extendInline`
${(_, { cellSize }) => `width:${cellSize}px;height:${cellSize}px;`}
`

const ControlsH = ctyled.div.styles({ flex: 1, width: '100%', lined: true })

const ControlsIH = ctyled.div.styles({
  flex: 1,
  lined: true,
})

interface CellWrapperProps {
  x: number
  y: number
  selected: Types.Position
  setSelected: (pos: Types.Position) => any
  exited: boolean
  setExited: (exited: boolean) => any
  mouseDown: boolean
  cellSize: number
}

function CellWrapper(props: CellWrapperProps) {
  const dispatch = useDispatch(),
    pos = useMemo<Types.Position>(() => ({ x: props.x, y: props.y }), [props.x, props.y]),
    isSelected = isEqual(pos, props.selected),
    isGlobal = useSelector(
      (state) => !!Selectors.getByPos(state.live.globalControls, pos)
    )

  const handleMouseDown = useCallback(() => {
      props.setSelected(pos)
    }, [pos]),
    handleMouseLeave = useCallback(
      (e) => {
        if (props.mouseDown && isSelected && e.shiftKey) props.setExited(true)
      },
      [props.mouseDown, isSelected]
    ),
    handleMouseUp = useCallback(() => {
      if (props.exited) {
        dispatch(
          Actions.moveControlGroup({
            src: props.selected,
            dest: pos,
          })
        )
        props.setSelected(pos)
      }
    }, [props.exited, props.selected, pos, props.setSelected])

  return (
    <GridCellWrapper
      selected={isSelected}
      exited={props.exited}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      cellSize={props.cellSize}
      isGlobal={isGlobal}
    >
      <GridCell x={props.x} y={props.y} />
    </GridCellWrapper>
  )
}

function ControlsGrid() {
  const container = useRef(null),
    { width, height } = useMeasure(container),
    dispatch = useDispatch()

  const size = useContext(CtyledContext).theme.size,
    selected = useSelector((state) => state.live.selectedPosition),
    gridSize = useSelector((state) => state.settings.gridSize),
    enabled = useSelector((state) => state.live.controlsEnabled)

  const count = Math.floor(gridSize),
    cellSize = width / count,
    rowCount = Math.ceil(height / cellSize)

  const [exited, setExited] = useState(false),
    [mouseDown, setMouseDown] = useState(false)

  useEffect(() => {
    function handleMouseUp() {
      setExited(false)
      setMouseDown(false)
    }
    window.addEventListener('mouseup', handleMouseUp)
    return () => window.removeEventListener('mouseup', handleMouseUp)
  }, [])

  const handleMouseDown = useCallback((e) => {
      e.preventDefault()
      setMouseDown(true)
    }, []),
    handleMouseUp = useCallback(() => setMouseDown(false), []),
    handleMouseMove = useCallback((e) => e.preventDefault(), []),
    handleIncZoom = useCallback(
      (diff) => {
        dispatch(
          Actions.setSettings({
            gridSize: gridSize + diff,
          })
        )
      },
      [width, gridSize, size]
    ),
    handleSetSelected = useCallback((position: Types.Position) => {
      dispatch(Actions.setSelectedPosition(position))
    }, [])

  return (
    <ControlsH>
      <PositionDetail position={selected} />
      <ControlsIH>
        <ControlsOptions onIncZoom={handleIncZoom} position={selected} />
        <ControlsGridWrapper
          enabled={enabled}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <GridInner inRef={container}>
            {_.range(rowCount).map((y) => {
              return (
                <GridRow key={y}>
                  {_.range(count).map((x) => {
                    return (
                      <CellWrapper
                        key={x}
                        x={x}
                        y={y}
                        selected={selected}
                        setSelected={handleSetSelected}
                        exited={exited}
                        setExited={setExited}
                        mouseDown={mouseDown}
                        cellSize={cellSize}
                      />
                    )
                  })}
                </GridRow>
              )
            })}
          </GridInner>
        </ControlsGridWrapper>
        <Presets />
        <Levels />
      </ControlsIH>
    </ControlsH>
  )
}

export default memo(ControlsGrid)
