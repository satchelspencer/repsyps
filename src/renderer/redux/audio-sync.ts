import { Store } from 'redux'
import _ from 'lodash'

import * as Types from 'lib/types'
import audio, { RATE } from 'lib/audio'
import { updateTime } from './actions'
import diff from 'lib/diff'
import reducer from 'renderer/redux/reducer'
import isEqual from 'lib/is-equal'

export default function syncAudio(store: Store<Types.State>) {
  let lastState: Types.State = null

  audio.init()

  const handleUpdate = () => {
    const currentState = store.getState()
    if (!lastState || currentState.playback !== lastState.playback) {
      // const change = diff(!lastState ? {} : lastState.playback, currentState.playback)
      // console.log('update playback', change)
      audio.updatePlayback(currentState.playback)
    }

    _.keys(currentState.sources).forEach(sourceId => {
      const source = currentState.sources[sourceId],
        sourceIsNew = !lastState || !lastState.sources[sourceId],
        sourcePlaybackHasChanged =
          sourceIsNew ||
          !isEqual(
            lastState.sources[sourceId].playback,
            currentState.sources[sourceId].playback
          )

      if (sourceIsNew) {
        console.log('new source', sourceId)
        audio.addSource(sourceId, [
          source.channels.getChannelData(0),
          source.channels.getChannelData(1),
        ])
      }

      if (sourcePlaybackHasChanged) {
        // const lastSource = lastState && lastState.sources[sourceId],
        //   change = diff(!lastSource ? {} : lastSource.playback, source.playback)
        // console.log('source change', change)
        audio.setTrack(sourceId, { sourceId, ...source.playback })
      }
    })

    if (lastState)
      _.keys(lastState.sources).forEach(sourceId => {
        if (!currentState.sources[sourceId]) {
          audio.removeTrack(sourceId)
          audio.removeSource(sourceId)
        }
      })

    lastState = currentState
  }
  store.subscribe(handleUpdate)
  handleUpdate()

  setInterval(() => {
    if (lastState && lastState.playback.playing) {
      const currentTiming = audio.getTiming(),
        action = updateTime(currentTiming)

      /* override last state so this change won't be sent back to where it came from */
      lastState = reducer(lastState, action)
      store.dispatch(action)
    }
  }, 50)

  audio.start()
}
