import React, { useCallback, memo } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'
import Slider from 'render/components/slider'
import Icon from 'render/components/icon'
import { RATE, EPSILON } from 'render/util/audio'
import { Value, SliderWrapper } from 'render/components/misc'
import ControlAdder from 'render/components/control-adder'
import PhaseDisplay from './phase-display'
import mappings from 'render/util/mappings'

const PeriodWrapper = ctyled.div.styles({
  align: 'center',
  gutter: 2,
  padd: 2,
  flex: 1,
})

const PeriodControl = memo(() => {
  const getMappedState = useCallback((state: Types.State) => {
      return {
        period: state.playback.period,
        time: state.playback.time,
      }
    }, []),
    { period, time } = useMappedState(getMappedState),
    dispatch = useDispatch(),
    handleChange = useCallback(
      v => dispatch(Actions.updatePlayback({ period: mappings.period.fromStandard(v) })),
      []
    )
  return (
    <PeriodWrapper>
      <Icon styles={{ size: s => s * 1.2 }} name="timer" />
      <SliderWrapper>
        <Slider value={mappings.period.toStandard(period)} onChange={handleChange} />
      </SliderWrapper>
      <ControlAdder
        name="Playback Rate"
        params={{ prop: 'period', global: true }}
        type="value"
      />
      <Value>{_.round(60 / (period / RATE), 0) + '/m'}</Value>
      <PhaseDisplay time={time} />
    </PeriodWrapper>
  )
})

export default PeriodControl
