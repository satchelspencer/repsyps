import { useEffect, useMemo, useContext, useRef } from 'react'
import { CtyledContext, Color } from 'ctyled'
import * as _ from 'lodash'

import * as Types from 'render/util/types'
import { findNearest } from 'render/util/impulse-detect'
import audio from 'render/util/audio'
import { DrawViewContext } from './track'
import { canvasScale } from 'render/util/env'

const lineWidth = canvasScale === 1 ? 1 : 3,
  thickLine = canvasScale === 1 ? 3 : 5

export default function useWaveformCanvas(
  view: DrawViewContext,
  track: Types.Track,
  source: Types.Source | null,
  sample: number,
  playLocked: boolean,
  scroll: boolean,
  jogging: boolean
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null),
    ctxt = useRef<CanvasRenderingContext2D | null | undefined>(undefined),
    ctyledContext = useContext(CtyledContext),
    visId = track.visibleSourceTrack,
    visibleLoaded = !!(source && visId && source.sourceTracks[visId].loaded),
    visibleOffset =
      visId === null ? null : track.playback.sourceTracksParams[visId].offset,
    effectivePos = track.playback.playing ? 0 /* position */ : 0,
    {
      scale,
      start,
      impulses,
      width,
      height,
      clickSample,
      centerSample,
      mouseDown,
    } = view,
    pwidth = width * canvasScale,
    editTrackLoaded =
      !!track.sourceTrackEditing &&
      !!source &&
      source.sourceTracks[track.sourceTrackEditing].loaded,
    editTrackOffset =
      !!track.sourceTrackEditing &&
      track.playback.sourceTracksParams[track.sourceTrackEditing].offset,
    chunks = useMemo(() => track.playback.chunks, [
      track.playback.playing ? sample : track.playback.chunks,
    ]),
    bounds = source?.bounds ?? []
  useEffect(() => {
    ctxt.current = canvasRef.current?.getContext('2d')
    if (ctxt.current) {
      ctxt.current.scale(2, 2)
      ctxt.current.imageSmoothingEnabled = canvasScale === 1
    }
  }, [])

  const bufferRes = pwidth,
    drawBuffers = useMemo(
      () => [new Float32Array(bufferRes * 2), new Float32Array(bufferRes * 2)],
      [width]
    )

  /* main waveform compute */
  useEffect(() => {
    if (visibleLoaded && width && visId)
      audio.getWaveform(visId, start - (visibleOffset ?? 0), scale, drawBuffers[0])
  }, [drawBuffers, track.visibleSourceTrack, start, scale, visibleLoaded])
  useEffect(() => {
    if (editTrackLoaded && width && track.sourceTrackEditing) {
      return audio.getWaveform(
        track.sourceTrackEditing,
        start - (editTrackOffset || 0),
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
    editTrackLoaded,
  ])

  useEffect(() => {
    if (!width || !ctxt.current) return
    const pwidth = width * canvasScale,
      pheight = height * canvasScale,
      ctx = ctxt.current,
      drawContext = {
        pwidth,
        pheight,
        scale,
        start,
        end: start + pwidth * scale,
        ctx,
        clickX: clickSample,
        center: centerSample,
        mouseDown,
        sample,
        color: ctyledContext.theme.color, //{fg: 'black', bg: 'white'},
        size:
          canvasScale === 1 ? ctyledContext.theme.size / 1.5 : ctyledContext.theme.size,
        playLocked,
        scroll,
        view,
      }

    ctx.clearRect(0, 0, pwidth, pheight)

    drawWaveform(drawContext, drawBuffers[0], visibleLoaded)
    if (track.sourceTrackEditing)
      drawWaveform(drawContext, drawBuffers[1], editTrackLoaded, 'rgba(255,0,0,0.7)')

    if (impulses) drawImpulses(drawContext, impulses)

    drawGutter(drawContext)
    drawPlayback(drawContext, track, chunks)
    drawCues(drawContext, track)
    drawBounds(drawContext, bounds, track.editing)
    drawDrag(drawContext)

    if (jogging) drawCursor(drawContext)
  }, [
    visibleLoaded,
    track.playback,
    effectivePos,
    track.editing,
    track.selected,
    sample,
    track.sourceTrackEditing,
    track.visibleSourceTrack,
    bounds,
    playLocked,
    track.cues,
    ctyledContext.theme.color,
    jogging,
    ..._.values(view),
  ])

  return { canvasRef }
}

export interface DrawingContext {
  pwidth: number
  pheight: number
  scale: number
  start: number
  end: number
  ctx: CanvasRenderingContext2D
  color: Color
  size: number
  sample: number
  clickX: number | null
  center: number | null
  mouseDown: boolean
  playLocked: boolean
  scroll: boolean
  view: DrawViewContext
}

const GUTTER_SIZE = 1.5

function drawGutter(context: DrawingContext) {
  const { pwidth, size, color, ctx } = context
  ctx.fillStyle = color.nudge(0.3).bg
  ctx.fillRect(0, 0, pwidth, size * GUTTER_SIZE)
}

function drawWaveform(
  context: DrawingContext,
  waveform: Float32Array,
  loaded: boolean,
  color?: string
) {
  const { pheight, pwidth, ctx, size } = context
  waveformLine(
    pwidth,
    pheight,
    ctx,
    waveform,
    color || context.color.contrast(-0.1).fg,
    loaded,
    size * GUTTER_SIZE
  )
}

export function waveformLine(
  pwidth: number,
  pheight: number,
  ctx: CanvasRenderingContext2D,
  waveform: Float32Array,
  color: string,
  loaded: boolean,
  offset?: number
) {
  offset = offset || 0
  const halfHeight = (pheight - offset) / 2,
    center = halfHeight + offset
  ctx.lineWidth = 1
  ctx.strokeStyle = color
  ctx.beginPath()
  if (loaded) {
    let maxp = 0,
      maxn = 0
    for (let i = 0; i < waveform.length / 2; i++) {
      maxp = waveform[i * 2]
      maxn = waveform[i * 2 + 1]
      if (maxp) ctx.lineTo(i, maxp * halfHeight + center)
      if (maxn) ctx.lineTo(i, maxn * halfHeight + center)
      if (!maxp && !maxn) ctx.lineTo(i, center)
    }
  } else {
    ctx.lineTo(0, center)
    ctx.lineTo(pwidth, center)
  }
  ctx.stroke()
}

export function drawImpulses(context: DrawingContext, impulses: number[]) {
  const { pwidth, pheight, scale, start, ctx, size } = context,
    offset = size * GUTTER_SIZE,
    end = scale * pwidth + start,
    white = 500,
    trans = 100

  ctx.lineWidth = lineWidth
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
      ctx.lineTo(x, pheight * (0.5 - value / 2) + offset / 2)
      ctx.lineTo(x, pheight * (0.5 + value / 2) + offset / 2)
      ctx.stroke()
    }
}

export function drawDrag(context: DrawingContext) {
  const { ctx, mouseDown, clickX, center, pheight, start, scale } = context

  if (mouseDown && clickX !== null && center !== null) {
    const centerSnap = (center - start) / scale,
      clickXSnap = (clickX - start) / scale
    ctx.fillStyle = 'rgba(255,0,0,0.1)'
    ctx.fillRect(clickXSnap, 0, centerSnap - clickXSnap, pheight)
  }
}

function getChunkEdges(chunks: number[], context: DrawingContext) {
  const lastChunkWidth = chunks[chunks.length - 1],
    endOfChunks = lastChunkWidth && chunks[chunks.length - 2] + lastChunkWidth,
    chunksStartX = (chunks[0] - context.start) / context.scale,
    chunksEndX = endOfChunks && (endOfChunks - context.start) / context.scale
  return [chunksStartX, chunksEndX]
}

function isVisible(xs: number[], context: DrawingContext) {
  return !(_.every(xs, (x) => x < 0) || _.every(xs, (x) => x > context.pwidth))
}

export function drawCues(context: DrawingContext, track: Types.Track) {
  const { ctx, size } = context,
    gsize = size * GUTTER_SIZE

  ctx.strokeStyle = 'rgba(255,0,130,0.5)'
  ctx.fillStyle = 'rgba(255,0,130,0.8)'

  for (let cueIndex = 0; cueIndex < track.cues.length; cueIndex++) {
    const cue = track.cues[cueIndex],
      [chunksStartX, chunksEndX] = getChunkEdges(cue.chunks, context)

    if (isVisible([chunksStartX, chunksEndX], context)) {
      /* vertical marker */
      if (chunksEndX) {
        ctx.beginPath()
        ctx.lineTo(chunksStartX, gsize)
        ctx.lineTo(chunksEndX, gsize)
        ctx.stroke()
      }

      /* cue number */
      ctx.textAlign = 'start'
      ctx.fillText(cueIndex + 1 + '', chunksStartX + size * 0.5, gsize * 1.75)

      ctx.lineWidth = lineWidth
      ctx.beginPath()
      ctx.lineTo(chunksStartX, 0)
      ctx.lineTo(chunksStartX, gsize * 2)
      ctx.stroke()
    }
  }
}

export function drawPlayback(
  context: DrawingContext,
  track: Types.Track,
  chunks: number[]
) {
  const {
      pheight,
      scale,
      start,
      ctx,
      sample,
      playLocked,
      pwidth,
      scroll,
      size,
      color,
    } = context,
    playing = track.playback.playing,
    [chunksStartX, chunksEndX] = getChunkEdges(chunks, context)

  /* cursor shadow */
  let px = playLocked && scroll ? pwidth / 2 : (sample - start) / scale
  ctx.fillStyle = context.color.fg + '33'
  ctx.fillRect(px - thickLine * 1.5, 0, thickLine * 3, pheight)

  if (isVisible([chunksStartX, chunksEndX], context)) {
    /* start chunk line */
    ctx.lineWidth = chunksEndX ? lineWidth : thickLine
    ctx.strokeStyle = 'rgba(255,0,0,0.5)'
    ctx.beginPath()
    ctx.lineTo(chunksStartX, 0)
    ctx.lineTo(chunksStartX, pheight)
    ctx.stroke()

    if (chunksEndX) {
      /* gutter hilight */
      ctx.fillStyle = playing ? 'rgba(255,0,0,0.3)' : color.contrast(-0.3).nudge(0.1).bq
      ctx.fillRect(chunksStartX, 0, chunksEndX - chunksStartX, size * GUTTER_SIZE)

      /* end line */
      ctx.beginPath()
      ctx.lineTo(chunksEndX, 0)
      ctx.lineTo(chunksEndX, pheight)
      ctx.stroke()
    }

    /* upcoming playback */
    if (track.nextPlayback) {
      const [nextChunksStartX, nextChunksEndX] = getChunkEdges(
        track.nextPlayback.chunks,
        context
      )
      ctx.fillStyle = playing ? 'rgba(255,0,0,0.03)' : 'rgba(0,0,0,0.03)'
      ctx.fillRect(
        nextChunksStartX,
        0,
        nextChunksEndX - nextChunksStartX,
        size * GUTTER_SIZE
      )
    }
  }

  /* cursor */
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = 'rgb(255,0,0)'
  ctx.beginPath()
  ctx.lineTo(px, 0)
  ctx.lineTo(px, pheight)
  ctx.stroke()
}

export function drawBounds(context: DrawingContext, bounds: number[], editing: boolean) {
  const { pheight, scale, start, end, ctx, color, size } = context,
    highContrast = color.contrast(0.2)

  bounds.forEach((sample, i) => {
    const next = bounds[i + 1],
      sampleWidth = next - sample
    if (next && sample > start - sampleWidth && next < end + sampleWidth) {
      const pixelwidth = sampleWidth / scale,
        px = (sample - start) / scale,
        alpha = pixelwidth > size * 3 ? 1 : Math.max((pixelwidth - size * 2) / size, 0)

      if (alpha > 0.0001) {
        ctx.globalAlpha = alpha * 0.7
        ctx.lineWidth = 1
        ctx.strokeStyle = highContrast.fg
        if (editing) ctx.setLineDash([10, 10])
        ctx.beginPath()
        ctx.lineTo(px, 0)
        ctx.lineTo(px, editing ? pheight : size * GUTTER_SIZE)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.font = 'bold ' + size + 'px sans-serif'
        ctx.textAlign = 'start'
        ctx.fillStyle = color.fg
        ctx.fillText(i + '', px + size * 0.5, size * 1.1)

        ctx.globalAlpha = 0.3
        ctx.beginPath()
        ctx.lineTo(px, 0)
        ctx.lineTo(px, pheight)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }
  })
}

export function drawCursor(context: DrawingContext) {
  const { pheight, ctx, pwidth } = context

  /* cursor shadow */
  let px = pwidth / 2
  ctx.fillStyle = context.color.fg + '33'
  ctx.fillRect(px - thickLine * 1.5, 0, thickLine * 3, pheight)

  /* cursor */
  ctx.lineWidth = lineWidth
  ctx.strokeStyle = context.color.fg
  ctx.beginPath()
  ctx.lineTo(px, 0)
  ctx.lineTo(px, pheight)
  ctx.stroke()
}
