import React, { useCallback, memo } from 'react'
import ctyled from 'ctyled'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'

import * as Types from '../redux/types'
import * as Actions from '../redux/actions'

import Slider from './slider'

const Head = ctyled.div.styles({
  padd: 0.5,
  bg: true,
  justify: 'stretch',
})

export default memo(function() {
  const getMappedState = useCallback((state: Types.AppState) => state.mix.length, []),
    length = useMappedState(getMappedState),
    dispatch = useDispatch(),
    handleChange = useCallback(val => {
      dispatch(
        Actions.updateMixState({
          length: val * 5 * 44100,
        })
      )
    }, [])

  return (
    <Head>
      <Slider value={length / 44100 / 5} onChange={handleChange} />
    </Head>
  )
})
