import React, { useCallback, memo } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import * as Types from 'lib/types'
import * as Actions from 'src/renderer/redux/actions'
import Slider from '../slider'
import Icon from 'renderer/icons'
import { RATE, EPSILON } from 'lib/audio'
import { Value, SliderWrapper } from '../misc'
import PhaseDisplay from './phase-display'

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
    dispatch = useDispatch()

  return (
    <PeriodWrapper>
      <Icon styles={{ size: s => s * 1.5 }} name="timer" />
      <SliderWrapper>
        <Slider
          value={1 - Math.pow((period - EPSILON) / 30 / RATE, 1 / 5)}
          onChange={v =>
            dispatch(
              Actions.updatePlayback({ period: Math.pow(1 - v, 5) * 30 * RATE + EPSILON })
            )
          }
        />
      </SliderWrapper>
      <Value>{_.round(60 / (period / RATE), 0) + '/m'}</Value>
      <PhaseDisplay time={time} />
    </PeriodWrapper>
  )
})

export default PeriodControl
