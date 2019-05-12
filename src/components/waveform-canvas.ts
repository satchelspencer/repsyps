import { useEffect, useMemo, useContext, useRef } from 'react'
import { CtyledContext, Color } from 'ctyled'
import * as _ from 'lodash'

import * as Types from '../redux/types'
import { BIN_SIZE } from '../dsp/impulse-detect'
import getMinMaxes from '../dsp/min-maxes'
import { DrawViewContext } from './waveform'

export default function useWaveformCanvas(
  view: DrawViewContext,
  track: Types.TrackState,
  buffer: Float32Array
) {
  const canvasRef = useRef(null),
    ctxt = useRef(null),
    ctyledContext = useContext(CtyledContext),
    minMaxes = useMemo(() => getMinMaxes(buffer), [buffer]),
    effectivePos = track.playback.on ? track.position : 0,
    { scale, start, impulses, width, height, clickX, center } = view

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
        color: ctyledContext.theme.color,
      }

    ctx.clearRect(0, 0, pwidth, pheight)

    drawWaveform(drawContext, minMaxes)
    if (track.editing) drawImpulses(drawContext, impulses)
    drawPlayback(drawContext, track)
    drawBounds(drawContext, track.bounds, track.editing)
    drawSelection(drawContext, clickX, center)
    drawNextPlayback(drawContext, track.nextPlayback)
  }, [
    buffer,
    track.playback,
    effectivePos,
    track.bounds,
    track.editing,
    track.selected,
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

export function drawImpulses(context: DrawingContext, impulses: Float32Array) {
  const { pwidth, pheight, scale, start, ctx } = context,
    end = scale * pwidth + start

  ctx.lineWidth = 3
  const r = 128 + Math.max((1 - scale / 512) * 128, 0)
  ctx.strokeStyle = `rgba(${r},${255 - r},${255 - r},1)`

  for (let i = Math.floor(start / BIN_SIZE); i < Math.floor(end / BIN_SIZE); i++) {
    const value = impulses[i],
      x = (i * BIN_SIZE - start) / scale
    if (value) {
      ctx.beginPath()
      ctx.lineTo(x, pheight * (0.5 - value / 2))
      ctx.lineTo(x, pheight * (0.5 + value / 2))
      ctx.stroke()
    }
  }
}

export function drawPlayback(context: DrawingContext, track: Types.TrackState) {
  const { pheight, scale, start, ctx } = context
  if (track.playback.length) {
    ctx.fillStyle = track.playback.on ? 'rgba(255,0,0,0.2)' : context.color.fg + '33'

    let sx = (track.playback.start - start) / scale,
      sw = track.playback.length / scale

    ctx.fillRect(sx, 0, sw, pheight)
  }
  if (true || track.playback.on) {
    let px = (track.playback.start + track.position - start) / scale
    ctx.fillStyle = context.color.fg + '33'
    ctx.fillRect(px - 10, 0, 20, pheight)

    const startX = (track.playback.start - start) / scale
    ctx.lineWidth = 5
    ctx.strokeStyle = track.selected ? 'rgba(255,0,0,0.5)' : context.color.fg + '99'
    ctx.beginPath()
    ctx.lineTo(startX, 0)
    ctx.lineTo(startX, pheight)
    ctx.stroke()

    ctx.lineWidth = 3
    ctx.strokeStyle = track.selected ? 'rgb(255,0,0)' : context.color.fg
    ctx.beginPath()
    ctx.lineTo(px, 0)
    ctx.lineTo(px, pheight)
    ctx.stroke()
  }
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export function drawBounds(context: DrawingContext, bounds: number[], editing: boolean) {
  const { pheight, scale, start, ctx, color } = context

  const fheight = pheight / 10,
    spacing = fheight / 4
  // ctx.fillStyle = 'rgba(0,0,0,0.6 )'
  // ctx.fillRect(0,0, pwidth, fheight)

  bounds.forEach((sample, i) => {
    const next = bounds[i + 1]
    const px = (sample - start) / scale

    // drag handle
    if (editing) {
      ctx.lineWidth = 3
      ctx.strokeStyle = context.color.fg
      ctx.beginPath()
      ctx.lineTo(px, 0)
      ctx.lineTo(px, fheight)
      ctx.stroke()
    }

    if (next) {
      const nx = (next - start) / scale,
        width = nx - px
      if (editing) {
        ctx.lineWidth = 1
        ctx.fillStyle = context.color.fg + 'dd'
        ctx.strokeStyle = context.color.bg + '99'
        roundedRect(
          ctx,
          px + spacing,
          fheight / 4,
          width - 2 * spacing,
          fheight * 0.5,
          spacing
        )
      } else {
        ctx.lineWidth = 3
        ctx.fillStyle = context.color.bg + '1f'
        ctx.strokeStyle = context.color.fg + '99'
        roundedRect(
          ctx,
          px,
          fheight / 4,
          width,
          pheight - fheight / 2,
          Math.min(spacing * 2, width / 2)
        )
      }
      ctx.fill()
      ctx.stroke()
    }
  })
}

export function drawSelection(context: DrawingContext, clickX: number, center: number) {
  const { pheight, ctx } = context
  if (clickX) {
    ctx.fillStyle = context.color.fg + '22'
    ctx.fillRect(clickX * 2, 0, (center - clickX) * 2, pheight)
  }
}

export function drawNextPlayback(
  context: DrawingContext,
  nextPlayback: Partial<Types.PlaybackState>[]
) {
  const { pheight, scale, start, ctx } = context
  nextPlayback.forEach(playback => {
    if (playback.length) {
      ctx.fillStyle = 'rgba(255,0,0,0.1)'

      let sx = (playback.start - start) / scale,
        sw = playback.length / scale

      ctx.fillRect(sx, 0, sw, pheight)
    }
  })
}
