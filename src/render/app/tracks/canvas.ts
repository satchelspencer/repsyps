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
  source: Types.Source,
  sample: number,
  playLocked: boolean,
  scroll: boolean
) {
  const canvasRef = useRef(null),
    ctxt = useRef(null),
    ctyledContext = useContext(CtyledContext),
    visibleLoaded = source.sourceTracks[track.visibleSourceTrack].loaded,
    effectivePos = track.playback.playing ? 0 /* position */ : 0,
    { scale, start, impulses, width, height, clickX, center, mouseDown } = view,
    pwidth = width * canvasScale,
    isSTEditing = !!track.sourceTrackEditing,
    editTrackLoaded = isSTEditing && source.sourceTracks[track.sourceTrackEditing].loaded,
    editTrackOffset =
      isSTEditing && track.playback.sourceTracksParams[track.sourceTrackEditing].offset

  useEffect(() => {
    ctxt.current = canvasRef.current.getContext('2d')
    ctxt.current.scale(2, 2)
    ctxt.current.imageSmoothingEnabled = canvasScale === 1
  }, [])

  const bufferRes = pwidth,
    drawBuffers = useMemo(
      () => [new Float32Array(bufferRes * 2), new Float32Array(bufferRes * 2)],
      [width]
    )

  /* main waveform compute */
  useEffect(() => {
    if (visibleLoaded && width)
      audio.getWaveform(track.visibleSourceTrack, start, scale, drawBuffers[0])
  }, [drawBuffers, track.visibleSourceTrack, start, scale, visibleLoaded])
  useEffect(() => {
    if (editTrackLoaded && width) {
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
    editTrackLoaded,
  ])

  useEffect(() => {
    if (!width) return
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
        clickX: clickX * canvasScale,
        center: center * canvasScale,
        mouseDown,
        sample,
        color: ctyledContext.theme.color, //{fg: 'black', bg: 'white'},
        size: canvasScale === 1 ? ctyledContext.theme.size / 2 : ctyledContext.theme.size,
        playLocked,
        scroll,
      }

    ctx.clearRect(0, 0, pwidth, pheight)

    drawWaveform(drawContext, drawBuffers[0], visibleLoaded)
    if (track.sourceTrackEditing)
      drawWaveform(drawContext, drawBuffers[1], editTrackLoaded, 'rgba(255,0,0,0.7)')

    if (impulses) drawImpulses(drawContext, impulses)

    drawGutter(drawContext, track.editing)
    //drawCues(drawContext, track)
    drawPlayback(drawContext, track)
    drawBounds(drawContext, source.bounds, track.editing)
    drawDrag(drawContext)
  }, [
    visibleLoaded,
    track.playback,
    effectivePos,
    track.editing,
    track.selected,
    sample,
    track.sourceTrackEditing,
    track.visibleSourceTrack,
    source.bounds,
    playLocked,
    track.cues,
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
  clickX: number
  center: number
  mouseDown: boolean
  playLocked: boolean
  scroll: boolean
}

const GUTTER_SIZE = 1.5

function drawGutter(context: DrawingContext, editing: boolean) {
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
  const { ctx, mouseDown, clickX, center, pheight } = context
  if (mouseDown) {
    ctx.fillStyle = 'rgba(255,0,0,0.1)'
    ctx.fillRect(clickX, 0, center - clickX, pheight)
  }
}

export function drawCues(context: DrawingContext, track: Types.Track) {
  const { ctx, start, scale, size } = context
  for (let cueIndex = 0; cueIndex < track.cues.length; cueIndex++) {
    const cue = track.cues[cueIndex],
      chunks = cue.playback.chunks
    for (let i = 0; i < chunks.length; i += 2) {
      const cstart = chunks[i],
        clength = chunks[i + 1],
        startX = (cstart - start) / scale,
        endX = (cstart + clength - start) / scale

      if (clength) {
        ctx.fillStyle = 'gainsboro'
        ctx.fillRect(startX, 0, endX - startX, size * GUTTER_SIZE)
      }
    }
  }
}

export function drawPlayback(context: DrawingContext, track: Types.Track) {
  const {
      pheight,
      scale,
      start,
      end: vend,
      ctx,
      sample,
      playLocked,
      pwidth,
      scroll,
      size,
    } = context,
    playing = track.playback.playing

  let px = playLocked && scroll ? pwidth / 2 : (sample - start) / scale
  ctx.fillStyle = context.color.fg + '33'
  ctx.fillRect(px - thickLine * 2, 0, thickLine * 4, pheight)

  for (let i = 0; i < track.playback.chunks.length; i += 2) {
    const cstart = track.playback.chunks[i],
      clength = track.playback.chunks[i + 1],
      startX = (cstart - start) / scale,
      endX = (cstart + clength - start) / scale

    if (!clength) {
      ctx.lineWidth = thickLine
      ctx.strokeStyle = 'rgba(255,0,0,0.5)'
      ctx.beginPath()
      ctx.lineTo(startX, 0)
      ctx.lineTo(startX, pheight)
      ctx.stroke()
    } else if (cstart > start - clength && vend + clength) {
      ctx.fillStyle = playing ? 'rgba(255,0,0,0.3)' : 'rgba(0,0,0,0.1)'
      ctx.fillRect(startX, 0, endX - startX, size * GUTTER_SIZE)

      /* draw lines at start and end of current chunk */
      ctx.lineWidth = lineWidth
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
        ctx.fillRect(startX, 0, endX - startX, size * GUTTER_SIZE)
      }
    }
  }

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

        ctx.font = size + 'px sans-serif'
        ctx.fillStyle = color.fg
        ctx.fillText(i + '', px + size / 2, size * 1.1)

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
