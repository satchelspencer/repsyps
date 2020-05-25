import React, { useEffect, useState, useRef, useCallback } from 'react'
import _ from 'lodash'

import { canvasScale } from 'render/util/env'
import { sub, unsub } from 'render/util/track-events'

function clip(x: number) {
  const v = 50
  return Math.abs(x) > v ? (x > 0 ? v : -v) : x
}

export default function useZoom(
  trackId: string,
  container: React.MutableRefObject<any>,
  center: number,
  setCenter: (center: number) => any,
  setCenterSample: (sample: number) => any,
  width: number,
  sample: number,
  playLocked: boolean,
  setPlayLocked: (locked: boolean) => any,
  scroll: boolean,
  loaded: boolean,
  selected: boolean
) {
  const [scale, setScale] = useState(1000),
    [start, setStart] = useState(-200 * 24 * canvasScale),
    [jogging, setJogging] = useState(false),
    handleWheel = useRef(null),
    pwidth = width * canvasScale,
    startRef = useRef(0),
    scaleRef = useRef(2)

  const end = start + pwidth * scale,
    wStart = sample - (pwidth / 2) * scale,
    rStart = Math.floor(wStart / scale) * scale,
    offScreen = sample < start || sample > end

  useEffect(() => {
    if (playLocked) {
      if (!scroll && offScreen) setStart(sample)
      if (scroll) setStart(rStart)
      setJogging(false)
    }
    if (!selected) setJogging(false)
  }, [playLocked, rStart, offScreen, loaded, selected])

  useEffect(() => {
    handleWheel.current = (e) => {
      setJogging(false)
      const { deltaX, deltaY, ctrlKey, metaKey } = e
      if (ctrlKey || metaKey || (deltaX && !deltaY)) e.preventDefault()
      if (ctrlKey || metaKey) {
        const scaleMultiplier = scale / 100,
          nextScale = Math.max(scale + clip(deltaY) * scaleMultiplier, 2),
          zoomCenter = playLocked ? width / 2 : center,
          dx = ((nextScale - scale) / 2) * zoomCenter * canvasScale
        setStart(start - dx)
        setScale(nextScale < 800 ? nextScale : Math.floor(nextScale))
      } else {
        const xonly = e.shiftKey || (Math.abs(deltaX) > 4 && Math.abs(deltaY) < 4),
          dx = e.shiftKey ? deltaY : deltaX
        if (xonly && playLocked) setPlayLocked(false)
        if (!playLocked || xonly) setStart(start + clip(dx) * scale)
      }
    }
    startRef.current = start
    scaleRef.current = scale
  }, [scale, start, playLocked, width])

  useEffect(() => {
    container.current.addEventListener(
      'wheel',
      (e) => {
        handleWheel.current && handleWheel.current(e)
      },
      { passive: false } //so we can prevent default
    )
  }, [container.current])

  useEffect(() => {
    sub(trackId, 'jog', (delta: number) => {
      const newStart = startRef.current + clip(delta) * scaleRef.current
      setJogging(true)
      setPlayLocked(false)
      setStart(newStart)
      setCenterSample(newStart + (width * scaleRef.current * canvasScale) / 2)
      setCenter(width / 2)
    })
  }, [trackId, width])
  useEffect(() => {
    return () => unsub(trackId, 'jog')
  }, [])

  return { scale, start, jogging }
}
