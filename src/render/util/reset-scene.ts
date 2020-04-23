import { useCallback } from 'react'
import * as _ from 'lodash'

import { useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import { resetTiming } from 'render/components/timing'
import audio from 'render/util/audio'

export default function useResetScene() {
  const dispatch = useDispatch()
  return useCallback(() => {
    audio.updateTime(0, false)
    dispatch(Actions.zeroInitValues())
    resetTiming()
  }, [])
}
