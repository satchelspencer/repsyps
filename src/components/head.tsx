import React, { useCallback, memo } from 'react'
import ctyled from 'ctyled'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'

import * as Types from '../redux/types'
import * as Actions from '../redux/actions'

import Slider from './slider'
import Icon from './icon'
import Frac from './frac'

const Head = ctyled.div.styles({
  padd: 0.5,
  bg: true,
  justify: 'stretch',
  color: c => c.nudge(0.1),
  align: 'center',
  gutter: 1,
  size: s => s * 1.1,
})

const SliderWrapper = ctyled.div.styles({ flex: 1 })

const TimingWrapper = ctyled.div

const FracWrapper = ctyled.div.styles({
  width: 5,
})

export default memo(function() {
  const getMappedState = useCallback((state: Types.AppState) => state.mix, []),
    mix = useMappedState(getMappedState),
    dispatch = useDispatch(),
    handleChange = useCallback(val => {
      dispatch(
        Actions.updateMixState({
          length: val * 5 * 44100,
        })
      )
    }, []),
    handlePlayPause = useCallback(() => dispatch(Actions.togglePlayback({})), [])

  return (
    <Head>
      <Icon
        asButton
        name={mix.on ? 'pause' : 'play'}
        onClick={handlePlayPause}
        styles={{ size: s => s * 2 }}
      />
      <SliderWrapper>
        <Slider value={mix.length / 44100 / 5} onChange={handleChange} />
      </SliderWrapper>
      <TimingWrapper>{_.round(60 / (mix.length / 44100), 0) + '/m'}</TimingWrapper>
      <FracWrapper>
        <Frac />
      </FracWrapper>
    </Head>
  )
})
