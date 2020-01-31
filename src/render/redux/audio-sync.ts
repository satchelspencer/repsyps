import { Store } from 'redux'
import _ from 'lodash'
import { remote } from 'electron'

import * as Types from 'lib/types'
import audio, { RATE } from 'lib/audio'
import { updateTime } from './actions'
import diff from 'lib/diff'
import reducer from 'render/redux/reducer'
import { getBuffer } from 'render/redux/buffers'
import isEqual from 'lib/is-equal'

export const UPDATE_PERIOD = 50,
  isDev = process.env.NODE_ENV === 'development'

export default function syncAudio(store: Store<Types.State>) {
  let lastState: Types.State = null

  const appPath = isDev ? './' : remote.app.getAppPath() + '/'
  audio.init(appPath)

  const handleUpdate = () => {
    const currentState = store.getState()
    if (!lastState || !isEqual(currentState.playback, lastState.playback)) {
      const change = diff(!lastState ? {} : lastState.playback, currentState.playback)
      //console.log('update playback', change)
      audio.updatePlayback(change)
    }

    _.keys(currentState.sources).forEach(sourceId => {
      const source = currentState.sources[sourceId],
        sourceIsNew = !lastState || !lastState.sources[sourceId],
        lastSource = lastState && lastState.sources[sourceId],
        sourcePlaybackHasChanged =
          sourceIsNew ||
          !isEqual(
            lastState.sources[sourceId].playback,
            currentState.sources[sourceId].playback
          )

      if (sourceIsNew) {
        console.log('new source', sourceId)
        audio.addSource(sourceId, getBuffer(sourceId))
      }

      if (sourcePlaybackHasChanged) {
        const change = diff(!lastSource ? {} : lastSource.playback, source.playback)
        //console.log('source change', change)
        /* update all the trackSources to have the same playback state */
        _.keys(source.trackSources).forEach(trackSourceId => {
          //console.log('pbchange', trackSourceId, change)
          if (lastSource && lastSource.trackSources[trackSourceId]) {
            audio.setTrack(trackSourceId, {
              sourceId: trackSourceId,
              ..._.omit(change, 'sample'),
            })
          }
        })
      }

      /* create and remove native tracks for each trackSource */
      const sourceTrackIds = _.keys(source.trackSources),
        lastSourceTrackIds = sourceIsNew ? [] : _.keys(lastSource.trackSources)

      sourceTrackIds.forEach(sourceTrackId => {
        const trackIsNew = !lastSourceTrackIds.includes(sourceTrackId),
          trackHasChange =
            trackIsNew ||
            !isEqual(
              lastSource.trackSources[sourceTrackId],
              source.trackSources[sourceTrackId]
            )
        if (trackIsNew) {
          audio.addSource(sourceTrackId, getBuffer(sourceTrackId))
          audio.setTrack(sourceTrackId, {
            ...source.playback,
            ...source.trackSources[sourceTrackId],
          })
        } else if (trackHasChange)
          audio.setTrack(sourceTrackId, {
            ...source.trackSources[sourceTrackId],
          })
      })

      lastSourceTrackIds.forEach(sourceTrackId => {
        if (!sourceTrackIds.includes(sourceTrackId)) audio.removeTrack(sourceTrackId)
      })
    })

    if (lastState)
      _.keys(lastState.sources).forEach(sourceId => {
        if (!currentState.sources[sourceId]) {
          audio.removeTrack(sourceId)
          _.keys(lastState.sources[sourceId].trackSources).forEach(trackSourceId => {
            audio.removeSource(trackSourceId)
          })
        }
      })

    lastState = currentState
  }
  store.subscribe(handleUpdate)
  handleUpdate()

  function update() {
    let start = new Date().getTime()
    if (lastState && lastState.playback.playing) {
      const currentTiming = audio.getTiming(),
        action = updateTime(currentTiming)
      //console.log(audio.getDebug())
      /* override last state so this change won't be sent back to where it came from */
      lastState = reducer(lastState, action)
      store.dispatch(action)
    }
    setTimeout(update, Math.max(UPDATE_PERIOD-(new Date().getTime()-start), 0))
  }
  update()
  // setInterval(() => {
  //   if (lastState && lastState.playback.playing) {
  //     const currentTiming = audio.getTiming(),
  //       action = updateTime(currentTiming)
  //     //console.log(audio.getDebug())
  //     /* override last state so this change won't be sent back to where it came from */
  //     lastState = reducer(lastState, action)
  //     store.dispatch(action)
  //   }
  // }, UPDATE_PERIOD)

  audio.start()
}
