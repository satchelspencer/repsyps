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
import Button from './button'
import Slider from './slider'
import Icon from './icon'

const CornerWrapper = ctyled.div.styles({
  padd: true,
  size: s => s * 1.3,
}).extend`
  bottom:0;
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
  rounded: 2
}).extendSheet`
  position:absolute;
  top:${({size}) => size}px;
  right:${({size}) => size}px;
  background:${({ color }) => color.bg + '99'};
`

const TrackContainer = ctyled.div.attrs({ selected: false }).styles({
  height: 11,
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

export default memo(function({ trackId }: WaveformProps) {
  //refs
  const container = useRef(null)

  // state
  const [center, setCenter] = useState(0),
    [movingBoundIndex, setMovingBoundIndex] = useState(-1),
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

  /* playback/selection */
  const handleMouseDown = useCallback(
      e => {
        const { x, y } = getRelativePos(e)
        if (Math.abs(y - height / 2) < 10 && track.editing) {
          const bound = getBoundIndex(x, boundView)
          if (bound !== -1) {
            setMovingBoundIndex(bound)
            dispatch(
              Actions.updateTrackPlayback({ id: trackId, playback: { on: false } })
            )
          }
        }

        if (!track.editing || track.selected) setClickX(x)
      },
      [track.editing, track.selected, ...boundViewValues]
    ),
    handleMouseMove = useCallback(
      e => {
        const { x } = getRelativePos(e)
        setCenter(x)
        if (movingBoundIndex !== -1) {
          const sample = getTimeFromPosition(x, true, view),
            newBounds = [...track.bounds]
          newBounds[movingBoundIndex] = sample
          dispatch(
            Actions.setTrackBounds({
              id: trackId,
              bounds: newBounds,
            })
          )
          const oldPos = track.bounds[movingBoundIndex],
            nextBound = track.bounds[movingBoundIndex + 1]

          if (track.playback.start === oldPos) {
            const newLen = track.playback.length && nextBound - sample
            dispatch(
              Actions.updateTrackPlayback({
                id: trackId,
                playback: {
                  start: sample,
                  length: newLen,
                  alpha: newLen ? newLen / length : null,
                },
              })
            )
          }

          if (track.playback.length === oldPos - track.playback.start) {
            const newLen = sample - track.playback.start
            dispatch(
              Actions.updateTrackPlayback({
                id: trackId,
                playback: { length: newLen, alpha: newLen / length },
              })
            )
          }
        }
      },
      [movingBoundIndex, ...boundViewValues, track]
    ),
    handleMouseUp = useCallback(
      e => {
        const { x, y } = getRelativePos(e),
          dx = x - clickX

        if (track.editing) {
          //EDITING
          if (!track.selected) return //if we are selected and in edit mode
          const next = getNextBoundIndex(x, boundView)
          if (movingBoundIndex !== -1) {
            //we were dragging a bound
            setMovingBoundIndex(-1)
          } else if (dx < 3 && Math.abs(y - height / 2) < 10 && next !== -1) {
            const endBound = track.bounds[next],
              startBound = track.bounds[next - 1],
              newLen = endBound - startBound
            dispatch(
              Actions.updateTrackPlayback({
                id: trackId,
                playback: {
                  start: startBound,
                  length: newLen,
                  alpha: newLen ? newLen / length : null,
                  aperiodic: true,
                },
                nextPlayback: [],
              })
            )
          } else setPlaybackFromCursor(x)
        } else {
          //SYNCED PLAYBACK
          const next = getNextBoundIndex(x, boundView),
            start = (clickX && getNextBoundIndex(clickX, boundView)) || next
          if (next !== -1) {
            let playBacks = []
            for (let bi = start; bi <= next; bi++) {
              const endBound = track.bounds[bi],
                startBound = track.bounds[bi - 1],
                newLen = endBound - startBound
              playBacks.push({
                start: startBound,
                length: newLen,
                alpha: 1,
                aperiodic: false,
              })
            }
            // cycle first to end of queue
            const first = playBacks.shift()
            playBacks.push(first)

            dispatch(
              Actions.updateTrackPlayback({
                id: trackId,
                playback: first,
                nextPlayback: playBacks,
              })
            )
          } else setPlaybackFromCursor(x)
        }
        setClickX(null)
      },
      [clickX, ...boundViewValues, track.selected, track.editing]
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
    inferLR = useCallback(
      e => {
        dispatch(
          Actions.setTrackBounds({
            id: trackId,
            bounds: inferTimeBase(track.playback, impulses),
          })
        )
      },
      [track.playback, impulses]
    ),
    inferLeft = useCallback(() => {
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
        const dx = x - clickX
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
        dispatch(Actions.updateTrackPlayback({ id: trackId, playback: { alpha } }))
      }, [])
    }, [])

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
            text={barLen ? _.round(barLen / 44100, 2) + 's' : '??'}
          >
            <CButton onClick={inferLR} children="&lsaquo; &rsaquo;" />
            <CButton onClick={inferLeft} children="&lsaquo;" />
            <CButton onClick={inferRight} children="&rsaquo;" />
            <CButton onClick={toggleEdit} children="save" />
          </TrackMenuItem>
          <TrackMenuItem
            icon="tape"
            text={
              playBackBar
                ? Math.floor(_.round(playBackBar / length, 2) * 100) + '%'
                : '100%'
            }
          />
          <DropdownMenuItem icon="meter" text={_.round(track.playback.alpha || 1, 2)}>
            <CButton children="1/4" onClick={setTrackAlpha(0.25)} />
            <CButton children="1/2" onClick={setTrackAlpha(0.5)} />
            <CButton children="1" onClick={setTrackAlpha(1)} />
            <CButton children="2" onClick={setTrackAlpha(2)} />
            <CButton children="4" onClick={setTrackAlpha(4)} />
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
        <TrackName>{track.name}</TrackName>
        <CornerWrapper>
          <Icon onClick={rmTrack} asButton name="close-thin" />
        </CornerWrapper>
      </TrackCanvasWrapper>
    </TrackContainer>
  )
})
