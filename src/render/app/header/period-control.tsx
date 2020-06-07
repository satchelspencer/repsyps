import React, { useCallback, memo } from 'react'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import mappings from 'render/util/mappings'

import Slider from 'render/components/slider'
import Icon from 'render/components/icon'
import { RATE } from 'render/util/audio'
import { Value, SliderWrapper } from 'render/components/misc'
import { adder } from 'render/components/control-adder'
import PhaseDisplay from './phase-display'
import { useTiming } from 'render/components/timing'

const PeriodWrapper = ctyled.div.styles({
  align: 'center',
  gutter: 2,
  padd: 2,
  flex: 1.5,
})

const PeriodSliderWrapper = adder(SliderWrapper)

const PhaseDisplayContainer = () => {
  const time = useTiming().time
  return <PhaseDisplay time={time} />
}

const PeriodValue = Value.styles({
  width: 9,
  justify: 'space-between',
  padd: 0,
  height: 1.8,
  align: 'center',
}).extend`overflow:hidden;`

const IncButton = adder(ctyled.div.class(active).styles({
  bg: true,
  align: 'center',
  hover: 0.5
}).extend`
  padding:${({ size }) => size / 8}px;
  margin:-${({ size }) => size / 8}px;
  cursor:pointer;
  height:100%;
`)

const INC_SIZE = RATE * 0.01

const periodParams = { globalProp: 'period' },
  upIncParams = { periodDelta: -INC_SIZE, invert: true },
  downIncParams = { periodDelta: INC_SIZE, invert: true }

const PeriodControl = memo(() => {
  const period = useSelector((state) => state.playback.period),
    dispatch = useDispatch(),
    handleChange = useCallback(
      (v) =>
        dispatch(Actions.updatePlayback({ period: mappings.period.fromStandard(v) })),
      []
    ),
    handleUp = useCallback(() => dispatch(Actions.incrementPeriod(-INC_SIZE)), []),
    handleDown = useCallback(() => dispatch(Actions.incrementPeriod(INC_SIZE)), [])
  return (
    <PeriodWrapper>
      <Icon scale={1.2} name="timer" />
      <PeriodSliderWrapper params={periodParams}>
        <Slider value={mappings.period.toStandard(period)} onChange={handleChange} />
      </PeriodSliderWrapper>
      <PeriodValue>
        <IncButton params={downIncParams} onClick={handleDown}>
          <Icon scale={1.2} asButton name="caret-left" />
        </IncButton>
        {_.round(60 / (period / RATE), 2) + '/m'}
        <IncButton params={upIncParams} onClick={handleUp}>
          <Icon scale={1.2} asButton name="caret-right" />
        </IncButton>
      </PeriodValue>
      <PhaseDisplayContainer />
    </PeriodWrapper>
  )
})

export default PeriodControl
