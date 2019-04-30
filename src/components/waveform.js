import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import {useDispatch} from 'react-redux'
import ctyled from 'ctyled'
import _ from 'lodash'
import getImpulses, { binSize } from '../dsp/impulse-detect'
import getMinMaxes from '../dsp/min-maxes'

const TrackContainer = ctyled.div.styles({
  height: 10,
  flex: 'none',
  border: 1,
})

const TrackCanvas = ctyled.canvas.styles({}).extend`
  position:absolute;
  width:100%;
  height:100%;
`

export default function Track({ buffer }) {
  const container = useRef(null),
    canvasRef = useRef(null),
    [scale, setScale] = useState(100),
    [start, setStart] = useState(0),
    [width, setWidth] = useState(0),
    [height, setHeight] = useState(0),
    [center, setCenter] = useState(0),
    handleWheel = useRef(null),
    ctxt = useRef(null)

  const handleMouseMove = useCallback(e => {
    setCenter(e.clientX - container.current.offsetLeft)
  }, [])

  useEffect(() => {
    ctxt.current = canvasRef.current.getContext('2d')
    ctxt.current.scale(2, 2)
  }, [])

  useEffect(() => {
    handleWheel.current = e => {
      const { deltaX, deltaY, ctrlKey } = e
      if (ctrlKey) {
        const scaleMultiplier = scale / 100,
          nextScale = Math.max(scale + deltaY * scaleMultiplier, 2),
          dx = (nextScale - scale) * center
        setStart(start - dx)
        setScale(nextScale)
      } else {
        setStart(start + deltaX * scale)
      }
    }
  }, [scale, start])

  useEffect(() => {
    container.current.addEventListener(
      'wheel',
      e => {
        e.preventDefault()
        handleWheel.current && handleWheel.current(e)
      },
      { passive: false }
    )
    setWidth(container.current.offsetWidth)
    setHeight(container.current.offsetHeight)
    setCenter(container.current.offsetWidth / 2)
  }, [container.current])

  const impulses = useMemo(() => getImpulses(buffer), [buffer]),
    minMaxes = useMemo(() => getMinMaxes(buffer), [buffer])

  useEffect(() => {
    if (!width) return
    const pwidth = width * 2,
      pheight = height * 2

    const ctx = ctxt.current
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, pwidth, pheight)
    ctx.strokeStyle = 'black'
    ctx.beginPath()

    const minMaxIndex = Math.floor(Math.log2(scale)) - 1,
      minMaxSize = Math.pow(2, minMaxIndex + 1),
      minMax = minMaxes[minMaxIndex]

    for (let i = 0; i < pwidth; i++) {
      let iStart = start + i * scale
      const minMaxSample = Math.floor(iStart / minMaxSize)
      const maxp = minMax[1][minMaxSample],
        maxn = minMax[0][minMaxSample]

      if (maxp) ctx.lineTo(i, maxp * (pheight / 2) + pheight / 2)
      if (maxn) ctx.lineTo(i, maxn * (pheight / 2) + pheight / 2)
    }
    ctx.stroke()

    const end = scale * pwidth + start

    ctx.strokeStyle = 'rgba(255,0,0,0.8)'

    for (let i = Math.floor(start / binSize); i < Math.floor(end / binSize); i++) {
      const value = impulses[i],
        x = (i * binSize - start) / scale
      if (value > 0.1) {
        ctx.beginPath()
        ctx.lineTo(x, 0)
        ctx.lineTo(x, pheight)
        ctx.stroke()
      }
    }

    ctx.strokeStyle = 'blue'
    ctx.beginPath()
    for (let i = Math.floor(start / binSize); i < Math.floor(end / binSize); i++) {
      const value = impulses[i],
        x = (i * binSize - start) / scale
      ctx.lineTo(x, -value * (pheight / 2) + pheight / 2)
    }
    ctx.stroke()
  }, [buffer, scale, start, width, height])

  return (
    <TrackContainer inRef={container} onMouseMove={handleMouseMove}>
      {scale}, {start}, {width} {height}
      <TrackCanvas
        inRef={canvasRef}
        width={width * 2}
        height={height * 2}
        style={{ width: '100%', height: '100%' }}
      />
    </TrackContainer>
  )
}
