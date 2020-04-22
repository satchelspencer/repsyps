import React, { useContext, createContext, useState, useMemo, useEffect } from 'react'
import _ from 'lodash'

import * as Types from 'render/util/types'
import uid from 'render/util/uid'

const defaultTimes: Types.TimingState = {
  time: 0,
  tracks: {},
  recTime: 0,
}

let currentTiming: Types.TimingState = defaultTimes,
  listeners: { [id: string]: () => void } = {}

export function updateTiming(timing: Types.TimingState) {
  currentTiming = timing
  _.each(listeners, (cb) => cb && cb())
}

export function resetTiming() {
  updateTiming(defaultTimes)
}

export function removeTrackTimings(trackIds: string[]) {
  updateTiming({
    ...currentTiming,
    tracks: _.omit(currentTiming.tracks, trackIds),
  })
}

export function getTiming() {
  return currentTiming
}

export interface TimingContext {
  timing: Types.TimingState
}

const timingContext = createContext<TimingContext>({
  timing: defaultTimes,
})

const { Provider } = timingContext

export function TimingContextProvider(props: any) {
  const listenerId = useMemo(uid, []),
    [timingState, setTimingState] = useState<Types.TimingState>(defaultTimes)

  useEffect(() => {
    listeners[listenerId] = () => setTimingState(currentTiming)
    return () => delete listeners[listenerId]
  }, [])

  const context = useMemo<TimingContext>(
    () => ({
      timing: timingState,
      updateTiming: setTimingState,
    }),
    [timingState]
  )
  return <Provider value={context}>{props.children}</Provider>
}

export function useTiming() {
  const { timing } = useContext(timingContext)
  return timing
}

export function useTrackTiming(trackId: string) {
  const { timing } = useContext(timingContext),
    track = timing.tracks[trackId]
  return track ? track.sample : 0
}
