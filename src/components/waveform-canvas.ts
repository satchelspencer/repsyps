import * as Types from '../redux/types'
import { binSize } from '../dsp/impulse-detect'

export interface DrawingContext {
  pwidth: number
  pheight: number
  scale: number
  start: number
  ctx: CanvasRenderingContext2D
}

export function drawWaveform(context: DrawingContext, minMaxes: Float32Array) {
  const { pwidth, pheight, scale, start, ctx } = context,
    halfHeight = pheight / 2

  ctx.lineWidth = 1
  ctx.strokeStyle = '#3a3333'
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

  for (let i = Math.floor(start / binSize); i < Math.floor(end / binSize); i++) {
    const value = impulses[i],
      x = (i * binSize - start) / scale
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
    ctx.fillStyle = track.playback.on ? 'rgba(255,0,0,0.2)' : 'rgba(0,0,0,0.2)'

    let sx = (track.playback.start - start) / scale,
      sw = track.playback.length / scale

    ctx.fillRect(sx, 0, sw, pheight)
  }
  if (track.playback.on) {
    let px = (track.playback.start + track.position - start) / scale
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.fillRect(px - 10, 0, 20, pheight)

    ctx.lineWidth = 3
    ctx.strokeStyle = 'rgb(255,0,0)'
    ctx.beginPath()
    ctx.lineTo(px, 0)
    ctx.lineTo(px, pheight)
    ctx.stroke()
  }
}
