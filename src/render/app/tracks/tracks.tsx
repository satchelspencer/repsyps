import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react'
import { useMappedState } from 'redux-react-hook'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import * as Types from 'lib/types'

import Source from './source'

const Sources = ctyled.div.styles({
  column: true,
  lined: true,
  endLine: true,
  height:'70%',
  flex: 'none',
  scroll: true,
  color: c => c.nudge(0.025),
  bg: true,
}).extendSheet`
  height:100%;
`

export default function Tracks() {
  const getMappedState = useCallback((state: Types.State) => {
      return state.sources
    }, []),
    sources = useMappedState(getMappedState),
    sourceIds = Object.keys(sources),
    wrapperRef = useRef(null),
    [vBounds, setVBounds] = useState<number[]>([0, 0]),
    updateVisible = useCallback(() => {
      const vstart = wrapperRef.current.scrollTop,
        vend = vstart + wrapperRef.current.offsetHeight

      setVBounds([vstart, vend])
    }, []),
    handleScroll = useMemo(() => _.throttle(updateVisible, 100, { leading: false }), [
      sourceIds,
    ])

  useEffect(() => updateVisible(), [wrapperRef.current])

  useEffect(() => {
    window.addEventListener('resize', updateVisible)
    return () => window.removeEventListener('resize', updateVisible)
  }, [])

  return (
    <Sources onScroll={handleScroll} inRef={wrapperRef}>
      {sourceIds.map(sourceId => (
        <Source vBounds={vBounds} key={sourceId} sourceId={sourceId} />
      ))}
    </Sources>
  )
}
