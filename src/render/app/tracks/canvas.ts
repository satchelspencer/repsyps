import { useEffect, useMemo, useContext, useRef } from 'react'
import { CtyledContext, Color } from 'ctyled'
import * as _ from 'lodash'

import * as Types from 'render/util/types'
import { getBuffer } from 'render/util/buffers'
import { BIN_SIZE } from 'render/util/impulse-detect'
import getMinMaxes from 'render/util/min-maxes'
import { DrawViewContext } from './track'

export default function useWaveformCanvas(
  view: DrawViewContext,
  track: Types.Track,
  source: Types.Source,
  trackId: string,
  sample: number
) {
  const canvasRef = useRef(null),
    ctxt = useRef(null),
    ctyledContext = useContext(CtyledContext),
    buffer = useMemo(() => getBuffer(track.visibleSourceTrack)[1], [
      track.visibleSourceTrack,
    ]),
    minMaxes = useMemo(() => getMinMaxes(buffer, track.visibleSourceTrack), [buffer]),
    editTrackMinMaxes = useMemo(() => {
      if (!track.sourceTrackEditing) return null
      else
        return getMinMaxes(
          getBuffer(track.sourceTrackEditing)[0],
          track.sourceTrackEditing
        )
    }, [track.sourceTrackEditing]),
    effectivePos = track.playback.playing ? 0 /* position */ : 0,
    { scale, start, impulses, width, height, clickX, center, mouseDown } = view

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
        clickX: clickX * 2,
        center: center * 2,
        mouseDown,
        sample,
        color: ctyledContext.theme.color, //{fg: 'black', bg: 'white'},
      }

    ctx.clearRect(0, 0, pwidth, pheight)

    drawWaveform(
      drawContext,
      minMaxes,
      track.playback.sourceTracksParams[track.visibleSourceTrack].offset
    )
    drawImpulses(drawContext, impulses)

    if (editTrackMinMaxes)
      drawWaveform(
        {
          ...drawContext,
          color: ctyledContext.theme.color.as(['rgba(255,0,0,0.3)', 'rgba(255,0,0,0.3)']),
        },
        editTrackMinMaxes,
        track.playback.sourceTracksParams[track.sourceTrackEditing].offset
      )

    drawPlayback(drawContext, track)
    drawBounds(drawContext, source.bounds, track.editing)
    drawDrag(drawContext)
  }, [
    buffer,
    track.playback,
    effectivePos,
    track.editing,
    track.selected,
    sample,
    track.sourceTrackEditing,
    track.visibleSourceTrack,
    source.bounds,
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
  sample: number
  clickX: number
  center: number
  mouseDown: boolean
}

export function drawDrag(context: DrawingContext) {
  const { ctx, mouseDown, clickX, center, pheight } = context
  if (mouseDown) {
    ctx.fillStyle = 'rgba(255,0,0,0.1)'
    ctx.fillRect(clickX, 0, center - clickX, pheight)
  }
}

export function drawWaveform(
  context: DrawingContext,
  minMaxes: [Float32Array, Float32Array, number][],
  offset: number
) {
  const { pwidth, pheight, scale, start, ctx } = context,
    halfHeight = pheight / 2
  ctx.lineWidth = 1
  ctx.strokeStyle = context.color.contrast(-0.1).fg
  ctx.beginPath()
  const minMaxIndex = Math.floor(Math.log2(scale)) - 1,
    minMaxSize = Math.pow(2, minMaxIndex + 1),
    minMax = minMaxes[minMaxIndex]

  for (let i = 0; i < pwidth; i++) {
    let iStart = start - offset + i * scale
    const minMaxSample = Math.floor(iStart / minMaxSize)
    const maxp = minMax[1][minMaxSample] * 0.75,
      maxn = minMax[0][minMaxSample] * 0.75

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
  ctx.strokeStyle = `rgba(${r},${r},${r},1)`

  for (let i = Math.floor(start / BIN_SIZE); i < Math.floor(end / BIN_SIZE); i++) {
    const value = impulses[i] * 0.75,
      x = (i * BIN_SIZE - start) / scale

    if (value) {
      ctx.beginPath()
      ctx.lineTo(x, pheight * (0.5 - value / 2))
      ctx.lineTo(x, pheight * (0.5 + value / 2))
      ctx.stroke()
    }
  }
}

export function drawPlayback(context: DrawingContext, track: Types.Track) {
  const { pheight, scale, start, ctx, sample } = context,
    playing = track.playback.playing

  let px = (sample - start) / scale
  ctx.fillStyle = context.color.fg + '33'
  ctx.fillRect(px - 10, 0, 20, pheight)

  for (let i = 0; i < track.playback.chunks.length; i += 2) {
    const cstart = track.playback.chunks[i],
      clength = track.playback.chunks[i + 1],
      startX = (cstart - start) / scale,
      endX = (cstart + clength - start) / scale,
      isCurrent = track.playback.chunkIndex === i / 2

    if (!clength) {
      ctx.lineWidth = 5
      ctx.strokeStyle = 'rgba(255,0,0,0.5)'
      ctx.beginPath()
      ctx.lineTo(startX, 0)
      ctx.lineTo(startX, pheight)
      ctx.stroke()
    } else {
      ctx.fillStyle = playing ? 'rgba(255,0,0,0.1)' : 'rgba(0,0,0,0.05)'
      ctx.fillRect(startX, 0, endX - startX, pheight)

      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(255,0,0,0.5)'
      ctx.beginPath()
      ctx.lineTo(startX, 0)
      ctx.lineTo(startX, pheight)
      ctx.stroke()
      ctx.beginPath()
      ctx.lineTo(endX, 0)
      ctx.lineTo(endX, pheight)
      ctx.stroke()
    }
  }

  if (track.nextPlayback) {
    for (let i = 0; i < track.nextPlayback.chunks.length; i += 2) {
      const cstart = track.nextPlayback.chunks[i],
        clength = track.nextPlayback.chunks[i + 1],
        startX = (cstart - start) / scale,
        endX = (cstart + clength - start) / scale

      if (clength) {
        ctx.fillStyle = playing ? 'rgba(255,0,0,0.03)' : 'rgba(0,0,0,0.03)'
        ctx.fillRect(startX, 0, endX - startX, pheight)
      }
    }
  }

  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgb(255,0,0)'
  ctx.beginPath()
  ctx.lineTo(px, 0)
  ctx.lineTo(px, pheight)
  ctx.stroke()
}

export function drawBounds(context: DrawingContext, bounds: number[], editing: boolean) {
  const { pheight, scale, start, ctx, color } = context,
    fheight = pheight / 10,
    spacing = fheight / 4,
    center = pheight / 2,
    highContrast = color.contrast(0.3)

  bounds.forEach((sample, i) => {
    const next = bounds[i + 1],
      px = (sample - start) / scale

    // ctx.lineWidth = 7
    // ctx.strokeStyle = highContrast.bg
    // ctx.beginPath()
    // ctx.lineTo(px, 0)
    // ctx.lineTo(px, pheight)
    // ctx.stroke()
    // bar line
    ctx.lineWidth = 1
    ctx.strokeStyle = highContrast.fg
    if (editing) ctx.setLineDash([10, 10])
    ctx.beginPath()
    ctx.lineTo(px, 0)
    ctx.lineTo(px, pheight)
    ctx.stroke()
    ctx.setLineDash([])
  })
}
