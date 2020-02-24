import { Store } from 'redux'
import _ from 'lodash'
import { remote } from 'electron'

import * as Types from 'render/util/types'
import audio from 'render/util/audio'
import * as Actions from './actions'
import * as Selectors from './selectors'
import diff from 'render/util/diff'
import reducer from 'render/redux/reducer'
import { getBuffer } from 'render/util/buffers'
import isEqual from 'render/util/is-equal'

export const UPDATE_PERIOD = 50,
  isDev = process.env.NODE_ENV === 'development'

export default function syncAudio(store: Store<Types.State>) {
  let lastState: Types.State = null

  const appPath = isDev ? './' : remote.app.getAppPath() + '/'
  audio.init(appPath)

  const handleUpdate = () => {
    const currentState = store.getState(),
      trackIds = Selectors.getActiveTrackIds(currentState),
      lastTrackIds = lastState ? Selectors.getActiveTrackIds(lastState) : []

    if (!lastState || !isEqual(currentState.playback, lastState.playback)) {
      const change = diff(!lastState ? {} : lastState.playback, currentState.playback)
      //console.log('update playback', change)
      audio.updatePlayback(change)
    }

    trackIds.forEach(trackId => {
      const track = currentState.live.tracks[trackId],
        trackIsNew = !lastState || !lastTrackIds.includes(trackId),
        lastTrack = lastState && (lastState.live.tracks[trackId] as Types.Track),
        trackPlaybackHasChanged =
          trackIsNew ||
          !isEqual(lastTrack.playback, track.playback) ||
          lastTrack.nextPlayback !== track.nextPlayback

      _.keys(track.playback.sourceTracksParams).forEach(sourceId => {
        const sourceIsNew = trackIsNew || !lastTrack.playback.sourceTracksParams[sourceId]
        if (sourceIsNew) audio.addSource(sourceId, getBuffer(sourceId))
      })

      if (!trackIsNew)
        _.keys(lastTrack.playback.sourceTracksParams).forEach(sourceId => {
          if (!track.playback.sourceTracksParams[sourceId]) audio.removeSource(sourceId)
        })

      if (trackPlaybackHasChanged) {
        const change: Types.NativeTrackChange = {
          playback: diff(trackIsNew ? {} : lastTrack.playback, track.playback),
          nextPlayback: track.nextPlayback,
        }
        audio.setMixTrack(trackId, change)
      }
    })

    if (lastState)
      lastTrackIds.forEach(trackId => {
        if (!trackIds.includes(trackId)) {
          audio.removeMixTrack(trackId)
          _.keys(lastState.live.tracks[trackId].playback.sourceTracksParams).forEach(sourceId =>
            audio.removeSource(sourceId)
          )
        }
      })

    lastState = currentState
  }
  store.subscribe(handleUpdate)
  handleUpdate()

  function update() {
    let start = new Date().getTime()
    if (lastState && lastState.playback.playing) {
      const currentTiming = audio.getTiming()
      /* override last state so this change won't be sent back to where it came from */
      lastState = reducer(
        lastState,
        Actions.updateTime({ timing: currentTiming, commit: false })
      )
      store.dispatch(Actions.updateTime({ timing: currentTiming, commit: true }))
    }
    setTimeout(update, Math.max(UPDATE_PERIOD - (new Date().getTime() - start), 0))
  }
  update()

  audio.start()
}
