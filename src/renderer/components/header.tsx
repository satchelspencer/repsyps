import React, { useCallback, useMemo, useState, useContext } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import { palette } from './theme'
import * as _ from 'lodash'
import ctyled, { inline, round, CtyledContext } from 'ctyled'

import * as Types from 'lib/types'
import * as Actions from 'src/renderer/redux/actions'
import Slider from './slider'
import Icon from 'renderer/icons'

const HeaderWrapper = ctyled.div.styles({
  bg: true,
  color: c => c.nudge(0.05).contrast(-0.1),
  //lined: true,
  align: 'center',
  gutter: 1,
}).extendSheet`
  height:40px;
  -webkit-app-region: drag;
  padding-left:72px;
`

const ControlsWrapper = ctyled.div.styles({
  gutter: 2,
  align: 'center',
  padd: 2,
  justify: 'space-between',
}).extendSheet`
  width:${({ size }) => size * 25 - 72}px;
`

const SliderWrapper = ctyled.div.styles({
  flex: 1,
})

const Value = ctyled.div.styles({
  bg: true,
  border: true,
  bgColor: c => c.contrast(0.5),
  width: 4,
  padd: 0.5,
  justify: 'center',
  align: 'center',
  rounded: true,
})

const VolumeWrapper = ctyled.div.styles({
  align: 'center',
  gutter: 2,
  padd: 2,
  flex: 1,
})

export function VolumeControl() {
  const [v, sv] = useState(0.5)
  return (
    <VolumeWrapper>
      <Icon styles={{ size: s => s * 1.6 }} asButton name="volume" />
      <SliderWrapper>
        <Slider value={v} onChange={sv} />
      </SliderWrapper>
    </VolumeWrapper>
  )
}

const PeriodWrapper = ctyled.div.styles({
  align: 'center',
  gutter: 2,
  padd: 2,
  flex: 1,
})

const PhaseDisplayWrapper = ctyled.div.styles({
  width: 1.7,
  height: 1.7,
  color: c => c.contrast(0.1),
  align: 'center',
  justify: 'center',
})

const polar = (cx: number, cy: number, radius: number, angle: number) => ({
  x: cx + radius * Math.cos(angle - Math.PI / 2),
  y: cy + radius * Math.sin(angle - Math.PI / 2),
})

export function PhaseDisplay() {
  const getMappedState = useCallback((state: Types.State) => {
      return state.playback.time
    }, []),
    time = useMappedState(getMappedState),
    radius = 40,
    x = 50,
    y = 50,
    startAngle = 0,
    endAngle = Math.PI * 2 * (time - Math.floor(time)),
    start = polar(x, y, radius, endAngle),
    end = polar(x, y, radius, startAngle),
    gt180 = endAngle - startAngle <= Math.PI ? '0' : '1',
    style = useContext(CtyledContext)

  return (
    <PhaseDisplayWrapper>
      <svg style={{ width: '100%', height: '100%' }} viewBox="0 0 100 100">
        <path
          stroke={style.theme.color.nudge(0.2).bg}
          fill="none"
          strokeWidth="20"
          d="M 49.99930186829924 10.00000000609235 A 40 40 0 1 0 50 10"
        />
        <path
          fill="none"
          stroke="#ff0000a6"
          strokeWidth="20"
          d={`M ${start.x} ${start.y} A ${radius} ${radius} 0 ${gt180} 0 ${end.x} ${end.y}`}
        />
      </svg>
    </PhaseDisplayWrapper>
  )
}

export function PeriodControl() {
  const [v, sv] = useState(0.5)
  return (
    <PeriodWrapper>
      <Icon styles={{ size: s => s * 1.5 }} asButton name="timer" />
      <SliderWrapper>
        <Slider value={v} onChange={sv} />
      </SliderWrapper>
      <Value>12/m</Value>
      <PhaseDisplay />
    </PeriodWrapper>
  )
}

export default function Header() {
  const getMappedState = useCallback((state: Types.State) => {
      return {}
    }, []),
    {} = useMappedState(getMappedState),
    dispatch = useDispatch()

  return (
    <HeaderWrapper>
      <ControlsWrapper>
        <Icon styles={{ size: s => s * 2 }} asButton name="prev" />
        <Icon styles={{ size: s => s * 2 }} asButton name="play" />
        <Icon styles={{ size: s => s * 2 }} asButton name="next" />
        <Icon styles={{ size: s => s * 2 }} asButton name="replay" />
        <Value>13</Value>
      </ControlsWrapper>
      <VolumeControl />
      <PeriodControl />
    </HeaderWrapper>
  )
}
