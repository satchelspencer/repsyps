import React, { memo, useState, useRef, useEffect, useContext, useCallback } from 'react'
import * as _ from 'lodash'
import { useDispatch } from 'react-redux'
import ctyled, { CtyledContext } from 'ctyled'

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
})

const ControlsGridVert = ctyled.div.styles({
  flex: 1,
  color: c => c.nudge(0.05),
  column: true,
  lined: true,
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

const ControlsH = ctyled.div.styles({ flex: 1, width: '100%' })

const ControlsIH = ctyled.div.styles({
  flex: 1,
  lined: true,
})

function ControlsGrid() {
  const [width, setWidth] = useState(0),
    [height, setHeight] = useState(0),
    [selected, setSelected] = useState<Types.Position>(null),
    grid = useRef(null),
    dispatch = useDispatch(),
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
      <ControlsGridVert>
        <ControlsIH>
          <ControlsGridWrapper
            onMouseDown={() => setMouseDown(true)}
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
        <ControlsOptions />
      </ControlsGridVert>
    </ControlsH>
  )
}

export default memo(ControlsGrid)
