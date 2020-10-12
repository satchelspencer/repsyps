import React, { useEffect, useState, useRef, useCallback } from 'react'
import _ from 'lodash'

import { canvasScale } from 'render/util/env'
import { sub, unsub } from 'render/util/track-events'

function clip(x: number) {
  const v = 50
  return Math.abs(x) > v ? (x > 0 ? v : -v) : x
}

export interface ZoomState {
  scale: number
  start: number
  jogging: boolean
}

export default function useZoom(
  trackId: string,
  container: React.MutableRefObject<any>,
  center: number,
  setCenter: (center: number) => any,
  setCenterSample: (sample: number | null) => any,
  width: number,
  sample: number,
  playLocked: boolean,
  setPlayLocked: (locked: boolean) => any,
  scroll: boolean,
  loaded: boolean,
  selected: boolean
) {
  const s = useRef<ZoomState>({
      scale: 1000,
      start: -200 * 24 * canvasScale,
      jogging: false,
    }),
    pwidth = width * canvasScale,
    { scale, start, jogging } = s.current,
    [u, setU] = useState(0),
    update = useCallback((state: Partial<ZoomState>) => {
      s.current = {
        ...s.current,
        ...state,
      }
      setU(Math.random())
    }, [])

  const centerRef = useRef(0)
  useEffect(() => {
    centerRef.current = center * canvasScale
  }, [center])

  const end = start + pwidth * scale,
    wStart = sample - (pwidth / 2) * scale,
    rStart = Math.floor(wStart / scale) * scale,
    offScreen = sample < start || sample > end

  useEffect(() => {
    if (playLocked) {
      if (!scroll && offScreen) update({ start: sample })
      else if (scroll) update({ start: rStart })
      update({ jogging: false })
    }
    if (!selected) update({ jogging: false })
  }, [playLocked, selected, rStart, offScreen, loaded])

  useEffect(() => {
    const handleWheel = (e) => {
      update({ jogging: false })
      const { deltaX, deltaY, ctrlKey, metaKey } = e,
        { scale, start } = s.current
      if (ctrlKey || metaKey || (deltaX && !deltaY)) e.preventDefault()
      if (ctrlKey || metaKey) {
        const scaleMultiplier = scale / 100,
          nextScale = Math.max(scale + clip(deltaY) * scaleMultiplier, 2),
          zoomCenter = playLocked ? width / 2 : centerRef.current,
          dx = ((nextScale - scale) / 2) * zoomCenter * canvasScale
        update({
          start: start - dx,
          scale: nextScale < 800 ? nextScale : Math.floor(nextScale),
        })
      } else {
        const xonly = e.shiftKey || (Math.abs(deltaX) > 4 && Math.abs(deltaY) < 4),
          dx = e.shiftKey ? deltaY : deltaX
        if (xonly && playLocked) setPlayLocked(false)
        if (!playLocked || xonly) update({ start: start + clip(dx) * scale })
        setCenterSample(start + centerRef.current * scale)
      }
    }
    container.current.addEventListener(
      'wheel',
      handleWheel,
      { passive: false } //so we can prevent default
    )
    return () => container.current.removeEventListener('wheel', handleWheel)
  }, [container.current, playLocked, width])

  useEffect(() => {
    sub(trackId, 'jog', (delta: number) => {
      const { scale, start } = s.current,
        newStart = start + clip(delta) * scale
      update({
        jogging: true,
        start: newStart,
      })
      setPlayLocked(false)
      setCenterSample(newStart + (width * scale * canvasScale) / 2)
      setCenter(width / 2)
    })
  }, [trackId, width])
  useEffect(() => {
    return () => unsub(trackId, 'jog')
  }, [])

  return s.current
}
