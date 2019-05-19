import React, { memo, useRef, useMemo, useState, useCallback } from 'react'
import ctyled, { active } from 'ctyled'
import { useDispatch, useMappedState } from 'redux-react-hook'
import _ from 'lodash'

import getImpulses from '../dsp/impulse-detect'
import useWaveformCanvas from './waveform-canvas'
import * as Types from '../redux/types'
import * as Actions from '../redux/actions'
import {
  inferTimeBase,
  getBoundIndex,
  getNextBoundIndex,
  getTimeFromPosition,
  getContainerPosition,
} from './waveform-utils'

import useZoom from './waveform-zoom'

import {
  useDraggableBounds,
  useMeasurePlayback,
  useSelectPlayback,
} from './waveform-mouse'

import Button from './button'
import Slider from './slider'
import Icon from './icon'

const CornerWrapper = ctyled.div.styles({
  padd: 2,
  gutter: 1,
  align: 'center',
}).extend`
  top:0;
  right:0;
  position:absolute;
`

const CButton = Button.styles({})

const TrackName = ctyled.div.styles({
  align: 'center',
  gutter: 1,
  flex: 1,
  padd: 0.7,
  color: c => c.invert(),
  rounded: 2,
}).extendSheet`
  background:${({ color }) => color.bg + '99'};
`

const TrackContainer = ctyled.div.attrs({ selected: false }).styles({
  height: 13,
  flex: 'none',
  color: (c, { selected }) => (selected ? c.nudge(0.1) : c.nudge(0.05)),
})

const TrackCanvas = ctyled.canvas
  .attrs({ selected: false })
  .styles({ color: (c, { selected }) => (selected ? c.nudge(0.1) : c) }).extend`
  position:absolute;
  width:100%;
  height:100%;
  transition:0.3s all;
  ${({ color }, { selected }) =>
    selected && `box-shadow:0 0 5px ${color.fg + '33'} inset;`}
`

const TrackControls = ctyled.div.styles({
  bg: true,
  lined: true,
  endLine: true,
  size: s => s * 0.9,
})

const VolumeWrapper = ctyled.div.styles({
  bg: true,
  padd: 0.5,
  color: c => c.nudge(-0.05),
})

const TrackMenu = ctyled.div.styles({
  bg: true,
  color: c => c.nudge(-0.05),
  column: true,
  justify: 'space-around',
  padd: 0.7,
  gutter: 0.5,
  width: 4,
})

const TrackMenuItemWrapper = ctyled.div
  .class(active)
  .attrs({ open: false })
  .styles({
    hover: (c, { open }) => !open,
    bg: true,
    rounded: 2,
    flatRight: (c, { open }) => open,
    color: (c, { open }) => (open ? c.nudge(0.2) : c),
    border: 1,
    justify: 'center',
  }).extend`
  border-color:${({ borderColor }, { open }) => (open ? borderColor.fg : 'transparent')};
`

const TrackMenuItemText = ctyled.div.styles({
  size: s => s * 0.8,
})

const MenuItemExpander = ctyled.div.styles({
  bg: true,
  rounded: 2,
  flatLeft: true,
  border: 1,
  align: 'center',
  padd: 0.7,
  gutter: 1,
}).extend`
  position:absolute;
  left:100%;
  top:0;
  bottom:0;
  z-index:1;
  border-left:none;
  margin:-1px;
  width: max-content;
`

const TrackMenuItemInner = ctyled.div.styles({
  column: true,
  gutter: 0.25,
  align: 'center',
  padd: 0.5,
}).extend`
  cursor:pointer;
`

const TrackMenuItem = ({
  icon,
  text,
  iconSize = 1,
  open = false,
  children,
  onClick,
  onMouseLeave,
}: {
  [s: string]: any
}) => {
  return (
    <TrackMenuItemWrapper onMouseLeave={onMouseLeave} open={open}>
      <TrackMenuItemInner onClick={onClick}>
        <Icon
          name={icon}
          styles={{
            size: s => s * iconSize,
          }}
        />
        <TrackMenuItemText>{text}</TrackMenuItemText>
      </TrackMenuItemInner>
      {open && <MenuItemExpander>{children}</MenuItemExpander>}
    </TrackMenuItemWrapper>
  )
}

const DropdownMenuItem = ({
  icon,
  text,
  iconSize = 1,
  children,
}: {
  [s: string]: any
}) => {
  const [open, setOpen] = useState(false)
  return (
    <TrackMenuItem
      open={open}
      onClick={() => setOpen(!open)}
      onMouseLeave={() => setOpen(false)}
      icon={icon}
      text={text}
      iconSize={iconSize}
      children={children}
    />
  )
}

const TrackCanvasWrapper = ctyled.div.styles({
  flex: 1,
  bg: true,
  color: c => c.contrast(0.1).nudge(0.1),
})

interface WaveformProps {
  trackId: string
}

export interface ViewContext {
  scale: number
  start: number
  center: number
  impulses: Float32Array
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
  editing: boolean
  selected: boolean
  height: number
  width: number
}

export default memo(function({ trackId }: WaveformProps) {
  //refs
  const container = useRef(null)

  // state
  const [center, setCenter] = useState(0),
    [clickX, setClickX] = useState(null)

  //redux/context
  const getMappedState = useCallback(
      (state: Types.AppState) => ({
        length: state.mix.length,
        track: state.tracks[trackId],
      }),
      [trackId]
    ),
    dispatch = useDispatch(),
    { length, track } = useMappedState(getMappedState)

  // computed data
  const buffer = useMemo(() => track.buffer.getChannelData(1), [track.buffer]),
    impulses = useMemo(() => getImpulses(buffer), [buffer])

  const { left, top, width, height } = getContainerPosition(container)

  /* ZOOM/PANNING CONTROL */
  const { scale, start } = useZoom(container, center)

  const view: ViewContext = {
      scale,
      start,
      center,
      impulses,
    },
    drawView: DrawViewContext = {
      ...view,
      clickX,
      width,
      height,
    },
    boundView: BoundViewContext = {
      ...view,
      bounds: track.bounds,
    },
    boundViewValues = _.values(boundView)

  /* WAVEFORM DRAWING ON CANVAS */
  const { canvasRef } = useWaveformCanvas(drawView, track, buffer)

  const getRelativePos = useCallback(e => ({ x: e.clientX - left, y: e.clientY - top }), [
    left,
    top,
  ])

  const clickCtxt: ClickEventContext = {
      clickX,
      editing: track.editing,
      selected: track.selected,
      height,
      width,
    },
    clickCtxtValues = _.values(clickCtxt)

  const select = useSelectPlayback(trackId),
    measure = useMeasurePlayback(trackId),
    dbounds = useDraggableBounds(trackId)

  /* playback/selection */
  const handleMouseDown = useCallback(
      e => {
        const pos = getRelativePos(e)
        dbounds.mouseDown(clickCtxt, pos, boundView)

        setClickX(pos.x)
      },
      [...clickCtxtValues, ...boundViewValues]
    ),
    handleMouseMove = useCallback(
      e => {
        const pos = getRelativePos(e)
        setCenter(pos.x)
        dbounds.mouseMove(clickCtxt, pos, boundView, length, track.playback)
      },
      [...clickCtxtValues, ...boundViewValues, length, track.playback]
    ),
    handleMouseUp = useCallback(
      e => {
        const pos = getRelativePos(e)

        select.mouseUp(clickCtxt, pos, boundView, length)
        measure.mouseUp(clickCtxt, pos, boundView, track.alpha, length)
        dbounds.mouseUp(clickCtxt, pos, boundView)

        setClickX(null)
      },
      [...clickCtxtValues, ...boundViewValues, track.alpha, length]
    ),
    handleClick = useCallback(() => dispatch(Actions.selectTrackExclusive(trackId)), [
      trackId,
    ]),
    toggleEdit = useCallback(
      () =>
        dispatch(
          Actions.editTrack({
            id: trackId,
            edit: !track.editing,
          })
        ),
      [trackId, track.editing]
    ),
    rmTrack = useCallback(() => dispatch(Actions.rmTrack(trackId)), [trackId]),
    volumeChange = useCallback(
      value => {
        dispatch(
          Actions.updateTrackPlayback({
            id: trackId,
            playback: { vol: value },
          })
        )
      },
      [trackId]
    ),
    inferLR = useCallback(() => {
      if (!track.playback.length) return
      dispatch(
        Actions.setTrackBounds({
          id: trackId,
          bounds: inferTimeBase(track.playback, impulses),
        })
      )
    }, [track.playback, impulses]),
    inferLeft = useCallback(() => {
      if (!track.playback.length) return
      const endPoint = track.playback.start + track.playback.length,
        inferredBounds = inferTimeBase(track.playback, impulses).filter(
          bound => bound <= endPoint
        ),
        existingBounds = track.bounds.filter(bound => bound > endPoint)

      dispatch(
        Actions.setTrackBounds({
          id: trackId,
          bounds: _.sortBy([...inferredBounds, ...existingBounds]),
        })
      )
    }, [track.playback, track.bounds, impulses]),
    inferRight = useCallback(() => {
      if (!track.playback.length) return
      const startPoint = track.playback.start,
        inferredBounds = inferTimeBase(track.playback, impulses).filter(
          bound => bound >= startPoint
        ),
        existingBounds = track.bounds.filter(bound => bound < startPoint)

      dispatch(
        Actions.setTrackBounds({
          id: trackId,
          bounds: _.sortBy([...inferredBounds, ...existingBounds]),
        })
      )
    }, [track.playback, track.bounds, impulses]),
    setPlaybackFromCursor = useCallback(
      x => {
        const dx = Math.abs(x - clickX)
        if (dx < 3) {
          //click to play
          const pos = getTimeFromPosition(x, true, view)
          dispatch(
            Actions.updateTrackPlayback({
              id: trackId,
              playback: { start: pos, length: 0, alpha: null, aperiodic: true },
              nextPlayback: [],
            })
          )
        } else {
          //dragged selection
          const start = getTimeFromPosition(clickX, true, view),
            end = getTimeFromPosition(x, true, view),
            len = Math.abs(end - start)
          dispatch(
            Actions.updateTrackPlayback({
              id: trackId,
              playback: {
                start: Math.min(start, end),
                length: len,
                alpha: len / length,
                aperiodic: true,
              },
              nextPlayback: [],
            })
          )
        }
      },
      [clickX, ...boundViewValues]
    ),
    setTrackAlpha = useCallback(alpha => {
      return useCallback(() => {
        dispatch(Actions.setTrackAlpha({ id: trackId, alpha }))
      }, [])
    }, []),
    handlePlayPause = useCallback(() => dispatch(Actions.toggleTrack(trackId)), [trackId])

  const avgBar = useMemo(() => {
      let sum = 0
      track.bounds.forEach((bound, i) => {
        const next = track.bounds[i + 1]
        if (next) sum += next - bound
      })
      return sum / (track.bounds.length - 1)
    }, [track.bounds]),
    playBackBar = useMemo(() => {
      const boundIndex = _.findIndex(track.bounds, (b, i) => {
        const next = track.bounds[i + 1],
          pos = track.playback.start + track.position
        return next && b < pos && next > pos
      })
      return boundIndex === -1
        ? 0
        : track.bounds[boundIndex + 1] - track.bounds[boundIndex]
    }, [track.bounds, track.playback, track.position])

  const barLen = playBackBar || avgBar

  return (
    <TrackContainer selected={track.selected} onClick={handleClick}>
      <TrackControls>
        <VolumeWrapper>
          <Slider value={track.playback.vol} column onChange={volumeChange} />
        </VolumeWrapper>
        <TrackMenu>
          <TrackMenuItem
            open={track.editing}
            onClick={toggleEdit}
            icon="timer"
            text={barLen ? _.round(60 / (barLen / 44100), 0) + '/m' : '??'}
          >
            <CButton onClick={inferLR} children="&lsaquo; &rsaquo;" />
            <CButton onClick={inferLeft} children="&lsaquo;" />
            <CButton onClick={inferRight} children="&rsaquo;" />
            <CButton onClick={toggleEdit} children="done" />
          </TrackMenuItem>
          <TrackMenuItem
            icon={track.playback.on ? 'pause' : 'play'}
            iconSize={1.6}
            text=""
            onClick={handlePlayPause}
          />
          <TrackMenuItem
            icon="tape"
            text={
              playBackBar
                ? Math.floor(
                    _.round(playBackBar / length / (track.playback.alpha || 1), 2) * 100
                  ) + '%'
                : '100%'
            }
          />
          <DropdownMenuItem icon="meter" text={_.round(1 / track.alpha || 1, 2)}>
            <CButton children="1/4" onClick={setTrackAlpha(4)} />
            <CButton children="1/2" onClick={setTrackAlpha(2)} />
            <CButton children="1" onClick={setTrackAlpha(1)} />
            <CButton children="2" onClick={setTrackAlpha(1 / 2)} />
            <CButton children="4" onClick={setTrackAlpha(1 / 4)} />
          </DropdownMenuItem>
        </TrackMenu>
      </TrackControls>
      <TrackCanvasWrapper
        inRef={container}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <TrackCanvas
          selected={track.selected}
          inRef={canvasRef}
          width={width * 2}
          height={height * 2}
        />

        <CornerWrapper>
          <TrackName>
            {track.name}&nbsp;
            <Icon
              asButton
              onClick={rmTrack}
              styles={{ size: s => s * 1.1, color: c => c.contrast(0.3) }}
              name="close-thin"
            />
          </TrackName>
        </CornerWrapper>
      </TrackCanvasWrapper>
    </TrackContainer>
  )
})
