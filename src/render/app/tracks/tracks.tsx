import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react'
import { useMappedState } from 'redux-react-hook'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import * as Types from 'render/util/types'
import * as Selectors from 'render/redux/selectors'

import Track from './track'

const TracksWrapper = ctyled.div.styles({
  column: true,
  lined: true,
  endLine: true,
  height: '70%',
  flex: 'none',
  scroll: true,
  color: c => c.nudge(0.025),
  bg: true,
}).extendSheet`
  height:100%;
`

export default function Tracks() {
  const getMappedState = useCallback((state: Types.State) => {
      return {
        trackIds: Selectors.getCurrentScene(state).trackIds,
      }
    }, []),
    { trackIds } = useMappedState(getMappedState),
    wrapperRef = useRef(null),
    [vBounds, setVBounds] = useState<number[]>([0, 0]),
    updateVisible = useCallback(() => {
      const vstart = wrapperRef.current.scrollTop,
        vend = vstart + wrapperRef.current.offsetHeight

      setVBounds([vstart, vend])
    }, []),
    handleScroll = useMemo(() => _.throttle(updateVisible, 100, { leading: false }), [
      trackIds,
    ])

  useEffect(() => updateVisible(), [wrapperRef.current])

  useEffect(() => {
    window.addEventListener('resize', updateVisible)
    return () => window.removeEventListener('resize', updateVisible)
  }, [])

  return (
    <TracksWrapper onScroll={handleScroll} inRef={wrapperRef}>
      {trackIds.map(trackId => (
        <Track vBounds={vBounds} key={trackId} trackId={trackId} />
      ))}
    </TracksWrapper>
  )
}
