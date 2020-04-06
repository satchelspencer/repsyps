import React, { useCallback, memo } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import mappings from 'render/util/mappings'

import Slider from 'render/components/slider'
import Icon from 'render/components/icon'
import { RATE } from 'render/util/audio'
import { Value, SliderWrapper } from 'render/components/misc'
import { adder } from 'render/components/control-adder'
import PhaseDisplay from './phase-display'

const PeriodWrapper = adder(
  ctyled.div.styles({
    align: 'center',
    gutter: 2,
    padd: 2,
    flex: 1,
  })
)

const PhaseDisplayContainer = () => {
  const time = useSelector(state => state.timing.time)
  return <PhaseDisplay time={time} />
}

const periodParams = { globalProp: 'period' }

const PeriodControl = memo(() => {
  const period = useSelector(state => state.playback.period),
    dispatch = useDispatch(),
    handleChange = useCallback(
      v => dispatch(Actions.updatePlayback({ period: mappings.period.fromStandard(v) })),
      []
    )
  return (
    <PeriodWrapper params={periodParams}>
      <Icon scale={1.2} name="timer" />
      <SliderWrapper>
        <Slider value={mappings.period.toStandard(period)} onChange={handleChange} />
      </SliderWrapper>
      <Value>{_.round(60 / (period / RATE), 0) + '/m'}</Value>
      <PhaseDisplayContainer />
    </PeriodWrapper>
  )
})

export default PeriodControl
