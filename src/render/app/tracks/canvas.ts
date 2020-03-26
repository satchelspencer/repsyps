import { useEffect, useMemo, useContext, useRef } from 'react'
import { CtyledContext, Color } from 'ctyled'
import * as _ from 'lodash'

import * as Types from 'render/util/types'
import { getBuffer } from 'render/util/buffers'
import { findNearest } from 'render/util/impulse-detect'
import audio from 'render/util/audio'
import { DrawViewContext } from './track'

export default function useWaveformCanvas(
  view: DrawViewContext,
  track: Types.Track,
  source: Types.Source,
  sample: number
) {
  const canvasRef = useRef(null),
    ctxt = useRef(null),
    ctyledContext = useContext(CtyledContext),
    channels = getBuffer(track.visibleSourceTrack),
    buffer = channels && channels[1],
    effectivePos = track.playback.playing ? 0 /* position */ : 0,
    { scale, start, impulses, width, height, clickX, center, mouseDown } = view,
    pwidth = width * 2,
    isSTEditing = !!track.sourceTrackEditing,
    editTrackBuffer = isSTEditing && !!getBuffer(track.sourceTrackEditing),
    editTrackOffset =
      isSTEditing && track.playback.sourceTracksParams[track.sourceTrackEditing].offset

  useEffect(() => {
    ctxt.current = canvasRef.current.getContext('2d')
    ctxt.current.scale(2, 2)
    ctxt.current.imageSmoothingEnabled = false
  }, [])

  const drawBuffers = useMemo(
    () => [new Float32Array(pwidth * 2), new Float32Array(pwidth * 2)],
    [width]
  )

  /* main waveform compute */
  useEffect(() => {
    if (buffer && width) {
      return audio.getWaveform(track.visibleSourceTrack, start, scale, drawBuffers[0])
    }
  }, [drawBuffers, track.visibleSourceTrack, start, scale, buffer])
  useEffect(() => {
    if (editTrackBuffer && width) {
      return audio.getWaveform(
        track.sourceTrackEditing,
        start - editTrackOffset,
        scale,
        drawBuffers[1]
      )
    }
  }, [
    drawBuffers,
    track.sourceTrackEditing,
    editTrackOffset,
    start,
    scale,
    editTrackBuffer,
  ])

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

    drawWaveform(drawContext, drawBuffers[0])
    if (track.sourceTrackEditing)
      drawWaveform(drawContext, drawBuffers[1], 'rgba(255,0,0,0.7)')

    if (impulses) drawImpulses(drawContext, impulses)

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

function drawWaveform(context: DrawingContext, waveform: Float32Array, color?: string) {
  const { pheight, ctx } = context,
    halfHeight = pheight / 2
  ctx.lineWidth = 1
  ctx.strokeStyle = color || context.color.contrast(-0.1).fg
  ctx.beginPath()
  let maxp = 0,
    maxn = 0
  for (let i = 0; i < waveform.length / 2; i++) {
    maxp = waveform[i * 2]
    maxn = waveform[i * 2 + 1]
    if (maxp) ctx.lineTo(i, maxp * halfHeight + halfHeight)
    if (maxn) ctx.lineTo(i, maxn * halfHeight + halfHeight)
  }
  ctx.stroke()
}

export function drawImpulses(context: DrawingContext, impulses: number[]) {
  const { pwidth, pheight, scale, start, ctx } = context,
    end = scale * pwidth + start,
    white = 300,
    trans = 100

  ctx.lineWidth = 3
  const r = 128 + Math.max((1 - scale / white) * 128, 0),
    o = 1 - Math.min(Math.max((scale - white) / trans, 0), 1)
  ctx.strokeStyle = `rgba(${r},${255 - r},${255 - r},${o})`

  if (o !== 0)
    for (
      let startIndex = findNearest(impulses, Math.max(start, 0));
      impulses[startIndex] < end;
      startIndex++
    ) {
      const x = (impulses[startIndex] - start) / scale,
        value = 0.1

      ctx.beginPath()
      ctx.lineTo(x, pheight * (0.5 - value / 2))
      ctx.lineTo(x, pheight * (0.5 + value / 2))
      ctx.stroke()
    }
}

export function drawDrag(context: DrawingContext) {
  const { ctx, mouseDown, clickX, center, pheight } = context
  if (mouseDown) {
    ctx.fillStyle = 'rgba(255,0,0,0.1)'
    ctx.fillRect(clickX, 0, center - clickX, pheight)
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
      endX = (cstart + clength - start) / scale

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
    highContrast = color.contrast(0.3)

  bounds.forEach((sample, i) => {
    const px = (sample - start) / scale
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
