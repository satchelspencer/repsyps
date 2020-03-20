import React, { memo, useState, useRef, useEffect, useContext, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled, { CtyledContext } from 'ctyled'

import * as Types from 'render/util/types'

import GridCell from './grid-cell'
import PositionDetail from './position'
import isEqual from 'src/render/util/is-equal'

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
const GridRow = ctyled.div.styles({})

const ControlsH = ctyled.div.styles({ flex: 1, width: '100%' })

function ControlsGrid() {
  const [width, setWidth] = useState(0),
    [height, setHeight] = useState(0),
    [selected, setSelected] = useState<Types.Position>(null),
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

  return (
    <ControlsH>
      <PositionDetail position={selected} />
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
                      onSelect={setSelected}
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
