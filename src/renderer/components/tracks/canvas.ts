import { useEffect, useMemo, useContext, useRef } from 'react'
import { CtyledContext, Color } from 'ctyled'
import * as _ from 'lodash'

import * as Types from 'lib/types'
import { BIN_SIZE } from '../../dsp/impulse-detect'
import getMinMaxes from '../../dsp/min-maxes'
import { DrawViewContext } from './source'

export default function useWaveformCanvas(
  view: DrawViewContext,
  source: Types.Source,
  buffer: Float32Array
) {
  const canvasRef = useRef(null),
    ctxt = useRef(null),
    ctyledContext = useContext(CtyledContext),
    minMaxes = useMemo(() => getMinMaxes(buffer), [buffer]),
    effectivePos = source.playback.playing ? 0 /* position */ : 0,
    { scale, start, impulses, width, height, clickX, center, time } = view

  useEffect(() => {
    ctxt.current = canvasRef.current.getContext('2d')
    ctxt.current.scale(2, 2)
    ctxt.current.imageSmoothingEnabled = false
  }, [])

  useEffect(() => {
    if (!width) return
    const pwidth = width * 2,
      pheight = height * 2,
      ctx = ctxt.current,
      drawContext = {
        pwidth,
        pheight,
        scale,
        start,
        ctx,
        time,
        color: ctyledContext.theme.color, //{fg: 'black', bg: 'white'},
      }

    ctx.clearRect(0, 0, pwidth, pheight)

    drawWaveform(drawContext, minMaxes)
    drawPlayback(drawContext, source)
  }, [
    buffer,
    source.playback,
    effectivePos,
    source.bounds,
    source.editing,
    source.selected,
    ..._.values(view),
  ])
  return { canvasRef }
}

export interface DrawingContext {
  pwidth: number
  pheight: number
  scale: number
  start: number
  ctx: CanvasRenderingContext2D
  color: Color
  time: number
}

export function drawWaveform(
  context: DrawingContext,
  minMaxes: [Float32Array, Float32Array, number][]
) {
  const { pwidth, pheight, scale, start, ctx } = context,
    halfHeight = pheight / 2
  ctx.lineWidth = 1
  ctx.strokeStyle = context.color.fg
  ctx.beginPath()
  const minMaxIndex = Math.floor(Math.log2(scale)) - 1,
    minMaxSize = Math.pow(2, minMaxIndex + 1),
    minMax = minMaxes[minMaxIndex]

  for (let i = 0; i < pwidth; i++) {
    let iStart = start + i * scale
    const minMaxSample = Math.floor(iStart / minMaxSize)
    const maxp = minMax[1][minMaxSample],
      maxn = minMax[0][minMaxSample]

    if (maxp) ctx.lineTo(i, maxp * halfHeight + halfHeight)
    if (maxn) ctx.lineTo(i, maxn * halfHeight + halfHeight)
  }
  ctx.stroke()
}

export function drawPlayback(context: DrawingContext, source: Types.Source) {
  const { pheight, scale, start, ctx, time } = context

  if (true || source.playback.playing) {
    let px = (time - start) / scale
    ctx.fillStyle = context.color.fg + '33'
    ctx.fillRect(px - 10, 0, 20, pheight)

    for (let i = 0; i < source.playback.chunks.length; i += 2) {
      const cstart = source.playback.chunks[i],
        clength = source.playback.chunks[i + 1],
        startX = (cstart - start) / scale,
        endX = (cstart + clength - start) / scale

      if (!clength) {
        ctx.lineWidth = 5
        ctx.strokeStyle = source.selected ? 'rgba(255,0,0,0.5)' : context.color.fg + '99'
        ctx.beginPath()
        ctx.lineTo(startX, 0)
        ctx.lineTo(startX, pheight)
        ctx.stroke()
      } else {
        ctx.fillStyle = 'rgba(255,0,0,0.1)'
        ctx.fillRect(startX, 0, endX-startX, pheight)
      }
    }

    ctx.lineWidth = 3
    ctx.strokeStyle = source.selected ? 'rgb(255,0,0)' : context.color.fg
    ctx.beginPath()
    ctx.lineTo(px, 0)
    ctx.lineTo(px, pheight)
    ctx.stroke()
  }
}
