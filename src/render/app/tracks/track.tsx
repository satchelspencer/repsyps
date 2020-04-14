import React, {
  memo,
  useRef,
  MutableRefObject,
  useMemo,
  useState,
  useCallback,
  useEffect,
} from 'react'
import ctyled from 'ctyled'
import _ from 'lodash'
import { SortableElement } from 'react-sortable-hoc'

import * as Types from 'render/util/types'
import { useSelector, useDispatch } from 'render/redux/react'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import { canvasScale } from 'render/util/env'

import getImpulses from 'render/util/impulse-detect'

import { getRelativePos, getBoundIndex, getTimeFromPosition } from './utils'
import { useSelectable } from 'render/components/selection'
import useMeasure from 'render/components/measure'

import useZoom from './zoom'
import useWaveformCanvas from './canvas'
import {
  useSelectPlayback,
  useResizeBounds,
  useResizePlayback,
  useSelectBound,
  usePlaybackBound,
  useOffsetTrack,
} from './mouse'
import TrackControls from './track-control'
import { palette } from 'src/render/components/theme'

const TrackWrapper = SortableElement(ctyled.div
  .attrs({ selected: false, warn: false })
  .styles({
    flex: 'none',
    lined: true,
    color: (c, { selected, warn }) =>
      warn
        ? c.as(palette.primary_red).contrast(0.2)
        : selected
        ? c.contrast(0.2)
        : c.contrast(0.1),
    borderColor: (c) => c.contrast(-0.2),
  }).extendSheet`
  height:${({ size }) => Math.ceil(size * 8) + 4}px;
  outline:none;
`)

const TrackCanvasWrapper = ctyled.div.attrs({ dim: false, disabled: false }).styles({
  flex: 1,
  bg: true,
  color: (c) => c.contrast(-0.1),
}).extend`
  ${(_, { dim }) => dim && `opacity:0.5;`}
  ${(_, { disabled }) => disabled && `pointer-events:none;`}
`

const TrackCanvas = ctyled.canvas.attrs({ selected: false }).extend`
  position:absolute;
  width:100%;
  height:100%;
  transition:0.15s all;
  image-rendering:pixelated;
`

export interface TrackContainerProps {
  trackId: string
  index: number
  vBounds: number[]
  listRef: MutableRefObject<HTMLDivElement>
}

export interface TrackProps {
  trackId: string
  track: Types.Track
  source: Types.Source
  visible: boolean
  noClick: boolean
  sample: number
  loaded: boolean
  playLock: boolean
  setPlayLock: (lock: boolean) => any
  trackScroll: boolean
}

export interface ViewContext {
  scale: number
  start: number
  center: number
  impulses: number[]
  mouseDown: boolean
}

export interface DrawViewContext extends ViewContext {
  clickX: number
  width: number
  height: number
}

export interface BoundViewContext extends ViewContext {
  bounds: number[]
}

export interface ClickEventContext {
  clickX: number
  aperiodic: boolean
  editing: boolean
  selected: boolean
  height: number
  width: number
  sourceTrackEditing: string | null
  currentEditingOffset: number | null
}

const Track = memo(
  function ({
    trackId,
    track,
    noClick,
    sample,
    source,
    loaded,
    playLock,
    setPlayLock,
    trackScroll,
  }: TrackProps) {
    /* computed data */
    const impulses = useMemo(() => loaded && getImpulses(trackId), [loaded, trackId])

    /* react state */
    const [center, setCenter] = useState(0),
      [clickX, setClickX] = useState(null),
      [mouseDown, setMouseDown] = useState(false)

    const container = useRef(null),
      { left, top, width, height } = useMeasure(container)

    /* ZOOM/PANNING CONTROL */
    const { scale, start } = useZoom(
      container,
      center,
      width,
      sample,
      playLock,
      setPlayLock,
      trackScroll
    )

    /* automatically lock track */
    useEffect(() => {
      if (!track.selected && track.playback.playing) setPlayLock(true)
    }, [track.selected, track.playback.playing])

    useEffect(() => {
      if (track.cueIndex != -1) setPlayLock(true)
    }, [track.cueIndex])

    /* drawing contexts */
    const view: ViewContext = {
        scale,
        start,
        center,
        impulses,
        mouseDown,
      },
      viewValues = _.values(view),
      drawView: DrawViewContext = {
        ...view,
        clickX,
        width,
        height,
      }

    /* click event contexts */
    const clickCtxt: ClickEventContext = {
        clickX,
        aperiodic: track.playback.aperiodic || !source.bounds.length,
        editing: track.editing,
        sourceTrackEditing: track.sourceTrackEditing,
        currentEditingOffset:
          track.sourceTrackEditing &&
          track.playback.sourceTracksParams[track.sourceTrackEditing].offset,
        selected: track.selected,
        height,
        width,
      },
      clickCtxtValues = _.values(clickCtxt)

    /* WAVEFORM DRAWING ON CANVAS */
    const { canvasRef } = useWaveformCanvas(
      drawView,
      track,
      source,
      sample,
      playLock,
      trackScroll
    )

    /* mouse event handlers */
    const selectPlaybackHandlers = useSelectPlayback(trackId),
      resizePlaybackHandlers = useResizePlayback(trackId),
      boundHandlers = useResizeBounds(trackId),
      selectBoundHandlers = useSelectBound(trackId),
      playbackBoundHandlers = usePlaybackBound(trackId),
      offsetTrackHandlers = useOffsetTrack(trackId)

    const handleMouseDown = useCallback(
        (e) => {
          if (e.shiftKey) {
            e.preventDefault()
            e.stopPropagation()
          }
          const pos = getRelativePos(e, left, top)
          resizePlaybackHandlers.mouseDown(clickCtxt, view, pos, track.playback.chunks)
          boundHandlers.mouseDown(clickCtxt, view, pos, source.bounds)
          offsetTrackHandlers.mouseDown(clickCtxt, pos, e.shiftKey)
          setClickX(pos.x)
          setMouseDown(true)
          setPlayLock(false)
        },
        [...clickCtxtValues, ...viewValues, track.playback.chunks, source.bounds]
      ),
      handleMouseMove = useCallback(
        (e) => {
          const pos = getRelativePos(e, left, top)
          boundHandlers.mouseMove(clickCtxt, view, pos, source.bounds)
          resizePlaybackHandlers.mouseMove(clickCtxt, pos, view, track.playback.chunks)
          offsetTrackHandlers.mouseMove(clickCtxt, pos, view)
          setCenter(pos.x)
        },
        [...clickCtxtValues, ...viewValues, track.playback.chunks]
      ),
      handleMouseUp = useCallback(
        (e) => {
          const pos = getRelativePos(e, left, top)

          playbackBoundHandlers.mouseUp(
            clickCtxt,
            pos,
            view,
            source.bounds,
            track.selected
          )

          const didSelectBound = selectBoundHandlers.mouseUp(
              clickCtxt,
              pos,
              view,
              source.bounds
            ),
            didResizeBound = boundHandlers.mouseUp(clickCtxt, pos, view),
            didResizePlayback = resizePlaybackHandlers.mouseUp(clickCtxt, pos, view),
            didOffsetTrack = offsetTrackHandlers.mouseUp(clickCtxt, pos)

          if (!didSelectBound && !didResizeBound && !didResizePlayback && !didOffsetTrack)
            selectPlaybackHandlers.mouseUp(clickCtxt, pos, view)
          setClickX(null)
          setMouseDown(false)
        },
        [...clickCtxtValues, ...viewValues, source.bounds, track.selected]
      ),
      handleDoubleClick = useCallback(
        (e) => {
          e.preventDefault()
          const pos = getRelativePos(e, left, top)
          selectBoundHandlers.doubleClick(clickCtxt, pos, view, source.bounds)
        },
        [...clickCtxtValues, ...viewValues, source.bounds]
      ),
      handleMouseLeave = useCallback(() => {
        setClickX(null)
        setMouseDown(false)
      }, [])

    const cursor = useMemo(() => {
      if (!track.editing) return 'crosshair'
      else {
        const boundIndex = getBoundIndex(center, view, source.bounds),
          sample = getTimeFromPosition(center, false, view),
          nearChunkIndex = _.findIndex(track.playback.chunks, (chunk, i) => {
            const csample = i % 2 === 0 ? chunk : chunk + track.playback.chunks[i - 1]
            return Math.abs(csample - sample) < 9 * view.scale
          })
        return boundIndex !== -1 || nearChunkIndex !== -1 ? 'col-resize' : 'crosshair'
      }
    }, [
      center,
      track.editing,
      source.bounds,
      track.playback.chunks,
      view.scale,
      view.start,
    ])

    return (
      <>
        <TrackCanvasWrapper
          style={{ cursor }}
          inRef={container}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onDoubleClick={handleDoubleClick}
          dim={!loaded}
          disabled={noClick || !loaded}
        >
          <TrackCanvas
            selected={track.selected}
            inRef={canvasRef}
            width={width * canvasScale}
            height={height * canvasScale}
          />
        </TrackCanvasWrapper>
      </>
    )
  },
  (prevProps, nextProps) => {
    return (
      !nextProps.visible || //if not visible never update
      (prevProps.track === nextProps.track &&
        prevProps.trackId === nextProps.trackId &&
        prevProps.sample === nextProps.sample &&
        prevProps.source === nextProps.source &&
        prevProps.loaded === nextProps.loaded)
    )
  }
)

const OFFSCREEN_THRESH = 250

export default function TrackContainer(props: TrackContainerProps) {
  const track = useSelector((state) => state.live.tracks[props.trackId]),
    source = useSelector((state) => state.sources[props.trackId]),
    sample = useSelector((state) => state.timing.tracks[props.trackId]),
    dispatch = useDispatch(),
    wrapperRef = useRef(null),
    [vstart, vend] = props.vBounds,
    start = wrapperRef.current && wrapperRef.current.offsetTop,
    end = wrapperRef.current && start + wrapperRef.current.offsetHeight,
    visible = !wrapperRef.current || (start < vend && end > vstart),
    offTop = start < vstart,
    offBottom = end > vend,
    wayOffScreen =
      !visible && (start - vend > OFFSCREEN_THRESH || vstart - end > OFFSCREEN_THRESH),
    { isSelecting, onSelect } = useSelectable<string>('track'),
    handleClick = useCallback(() => {
      if (isSelecting) onSelect(props.trackId)
      else !track.selected && dispatch(Actions.selectTrackExclusive(props.trackId))
    }, [props.trackId, isSelecting, onSelect]),
    isLoaded = useSelector((state) => Selectors.getTrackIsLoaded(state, props.trackId)),
    hasMissingSource = _.some(_.values(source.sourceTracks), (track) => track.missing),
    trackScroll = useSelector((state) => state.settings.trackScroll),
    inferredSample = sample || track.playback.chunks[0],
    handleMouseLeave = useCallback(() => {
      if (!track.editing && track.playback.playing && !track.playLock)
        dispatch(
          Actions.setTrackPlayLock({
            trackId: props.trackId,
            playlock: true,
          })
        )
    }, [track.editing, track.playback.playing, track.playLock, props.trackId])

  useEffect(() => {
    if (track.selected && props.listRef.current) {
      if (offTop)
        props.listRef.current.scrollTo({
          top: start,
          behavior: 'smooth',
        })
      else if (offBottom)
        props.listRef.current.scrollTo({
          top: end - props.listRef.current.offsetHeight,
          behavior: 'smooth',
        })
    }
  }, [track.selected])

  return (
    <TrackWrapper
      index={props.index}
      inRef={wrapperRef}
      onClick={handleClick}
      selected={track.selected}
      warn={hasMissingSource}
      tabIndex={-1}
      onMouseLeave={handleMouseLeave}
    >
      {!wayOffScreen && (
        <>
          <TrackControls trackId={props.trackId} />
          <Track
            loaded={isLoaded}
            noClick={isSelecting}
            visible={visible}
            trackId={props.trackId}
            track={track}
            source={source}
            sample={inferredSample}
            playLock={track.playLock}
            setPlayLock={(locked) =>
              dispatch(
                Actions.setTrackPlayLock({
                  trackId: props.trackId,
                  playlock: locked,
                })
              )
            }
            trackScroll={trackScroll}
          />
        </>
      )}
    </TrackWrapper>
  )
}
