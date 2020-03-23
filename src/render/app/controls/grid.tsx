import React, { memo, useState, useRef, useEffect, useContext, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled, { CtyledContext } from 'ctyled'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'

import GridCell from './grid-cell'
import PositionDetail from './position'
import ControlsOptions from './options'
import Presets from './presets'
import isEqual from 'src/render/util/is-equal'

const ControlsGridWrapper = ctyled.div.styles({
  flex: 1,
  bg: true,
  color: c => c.nudge(0.05)
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

const GridCellWrapper = ctyled.div.attrs({ selected: false, exited: false }).styles({
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
    background:${({ color }, { selected, exited }) =>
      exited ? 'inherit' : selected ? '#ff00000d' : color.nudge(0.05).bg};
    ${(_, { exited }) => exited && `box-shadow:0 0 2px 5px inset #ff000012;`}
  }
`

const ControlsH = ctyled.div.styles({ flex: 1, width: '100%', lined: true })

const ControlsIH = ctyled.div.styles({
  flex: 1,
  lined: true,
})

function ControlsGrid() {
  const size = useContext(CtyledContext).theme.size,
    [width, setWidth] = useState(0),
    [height, setHeight] = useState(0),
    [selected, setSelected] = useState<Types.Position>(null),
    [targetWidth, setTargetWidth] = useState(size * 8),
    grid = useRef(null),
    dispatch = useDispatch(),
    enabled = useSelector(state => state.live.controlsEnabled),
    handleResize = useCallback(() => {
      setWidth(grid.current.offsetWidth)
      setHeight(grid.current.offsetHeight)
    }, [])

  useEffect(() => {
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const count = Math.ceil(width / targetWidth),
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

  return (
    <ControlsH>
      <PositionDetail position={selected} />

      <ControlsIH>
        <ControlsOptions
          onIncZoom={diff => {
            setTargetWidth(width / (width / targetWidth + diff))
          }}
        />
        <ControlsGridWrapper
          style={{ opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? 'all' : 'none' }}
          onMouseDown={e => {
            e.preventDefault()
            setMouseDown(true)
          }}
          onMouseUp={() => setMouseDown(false)}
          onMouseMove={e => e.preventDefault()}
        >
          <GridInner
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
                    const pos = { x, y },
                      isSelected = isEqual(pos, selected)
                    return (
                      <GridCellWrapper
                        key={x}
                        selected={isSelected}
                        exited={exited}
                        onMouseDown={() => {
                          setSelected(pos)
                        }}
                        onMouseLeave={e => {
                          if (mouseDown && isSelected && e.shiftKey) setExited(true)
                        }}
                        onMouseUp={() => {
                          if (exited) {
                            dispatch(
                              Actions.moveControlGroup({
                                src: selected,
                                dest: pos,
                              })
                            )
                            setSelected(pos)
                          }
                        }}
                        style={{ height: cellSize, width: cellSize }}
                      >
                        <GridCell x={x} y={y} />
                      </GridCellWrapper>
                    )
                  })}
                </GridRow>
              )
            })}
          </GridInner>
        </ControlsGridWrapper>
        <Presets />
      </ControlsIH>
    </ControlsH>
  )
}

export default memo(ControlsGrid)
