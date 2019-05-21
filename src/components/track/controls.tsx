import React, { memo, useMemo, useState, useCallback } from 'react'
import ctyled, { active } from 'ctyled'
import _ from 'lodash'
import { useDispatch } from 'redux-react-hook'

import * as Actions from '../../redux/actions'
import * as Types from '../../redux/types'
import { inferTimeBase } from './utils'

import Button from '../button'
import Slider from '../slider'
import Icon from '../icon'

const CButton = Button.styles({})

const TrackControls = ctyled.div.styles({
  bg: true,
  lined: true,
  endLine: true,
  size: s => s * 0.9
})

const VolumeWrapper = ctyled.div.styles({
  bg: true,
  padd: 0.5,
  color: c => c.nudge(-0.1),
})

const TrackMenu = ctyled.div.styles({
  bg: true,
  color: c => c.nudge(-0.15),
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
    color: (c, { open }) => (open ? c.nudge(-0.05) : c),
    border: 1,
    justify: 'center',
  }).extend`
  border-color:${({ borderColor }, { open }) => (open ? borderColor.bq : 'transparent')};
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

interface ControlsProps {
  trackId: string
  track: Types.TrackState
  impulses: Float32Array
  length: number
}

export default memo(function({ trackId, track, impulses, length }: ControlsProps) {
  const dispatch = useDispatch()
  /* playback/selection */
  const toggleEdit = useCallback(
      () =>
        dispatch(
          Actions.editTrack({
            id: trackId,
            edit: !track.editing,
          })
        ),
      [trackId, track.editing]
    ),
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
  )
})
