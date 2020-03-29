import { Store, Action } from 'redux'
import _ from 'lodash'
import { remote } from 'electron'
import { batchActions } from 'redux-batched-actions'

import * as Types from 'render/util/types'
import audio from 'render/util/audio'
import * as Actions from './actions'
import * as Selectors from './selectors'
import diff from 'render/util/diff'
import reducer from 'render/redux/reducer'
import isEqual from 'render/util/is-equal'

export const UPDATE_PERIOD = 50,
  isDev = process.env.NODE_ENV === 'development'

type TrackPlaybackState = {
  playback: Types.TrackPlayback
  nextPlayback: Types.TrackPlayback
}

export default function syncAudio(store: Store<Types.State>) {
  let lastState: Types.State = null,
    playbackSelectors: {
      [trackId: string]: (state: Types.State, trackId: string) => TrackPlaybackState
    } = {},
    lastTrackPlaybacks: { [trackId: string]: TrackPlaybackState } = {},
    lastGlobalPlayback: Types.Playback = null,
    loadingSources: { [sourceId: string]: boolean } = {}

  const appPath = isDev ? './' : remote.app.getAppPath() + '/'
  audio.init(appPath)

  const handleUpdate = () => {
    const currentState = store.getState(),
      trackIds = Selectors.getActiveTrackIds(currentState),
      lastTrackIds = lastState ? Selectors.getActiveTrackIds(lastState) : [],
      playback = Selectors.getGlobalPlayback(currentState)

    if (!lastState || !isEqual(playback, lastGlobalPlayback)) {
      const change = diff(!lastState ? {} : lastGlobalPlayback, playback)
      //console.log('update playback', change)
      audio.updatePlayback(change)
      lastGlobalPlayback = playback
    }

    trackIds.forEach(trackId => {
      const trackIsNew = !lastState || !lastTrackIds.includes(trackId),
        source = currentState.sources[trackId]

      if (trackIsNew) playbackSelectors[trackId] = Selectors.makeGetTrackPlayback()
      const prev = lastTrackPlaybacks[trackId],
        current = playbackSelectors[trackId](currentState, trackId)

      _.keys(current.playback.sourceTracksParams).forEach(async sourceId => {
        const sourceTrack = source.sourceTracks[sourceId],
          sourceIsNew = trackIsNew || !sourceTrack.loaded

        if (sourceIsNew && !loadingSources[sourceId] && !sourceTrack.streamIndex) {
          const trackName = source.name,
            sourcePath = sourceTrack.source

          loadingSources[sourceId] = true
          const loadedIds = await audio.loadSource(sourcePath, sourceId)
          const newTrackActions: Action<any>[] = [
            Actions.didLoadTrackSource({
              sourceId: trackId,
              sourceTrackId: sourceId,
              loaded: true,
            }),
          ]

          loadedIds.forEach((sourceTrackId, index) => {
            if (!source.sourceTracks[sourceTrackId]) {
              newTrackActions.push(
                Actions.createTrackSource({
                  sourceId: trackId,
                  sourceTrackId,
                  sourceTrack: {
                    name: index + ':' + trackName,
                    source: sourcePath,
                    loaded: true,
                    streamIndex: index, //only first source is primary
                  },
                })
              )
              newTrackActions.push(
                Actions.setTrackSourceParams({
                  trackId: trackId,
                  sourceTrackId,
                  sourceTrackParams: {
                    volume: 0,
                    offset: 0,
                  },
                })
              )
            }
          })
          delete loadingSources[sourceId]
          store.dispatch(batchActions(newTrackActions, 'LOAD_TRACK'))
          //console.log('n', JSON.stringify(current, null, 2))
          audio.setMixTrack(trackId, current)
        }
      })

      const trackPlaybackHasChanged =
          trackIsNew ||
          !isEqual(prev.playback, current.playback) ||
          prev.nextPlayback !== current.nextPlayback,
        trackIsLoaded = source.sourceTracks[trackId].loaded

      if (trackPlaybackHasChanged && trackIsLoaded) {
        const change: Types.NativeTrackChange = {
          playback: diff(trackIsNew ? {} : prev.playback, current.playback, ['playing']),
          nextPlayback: current.nextPlayback,
        }
        //console.log('c', JSON.stringify(change, null, 2))
        audio.setMixTrack(trackId, change)
      }

      if (!trackIsNew)
        _.keys(prev.playback.sourceTracksParams).forEach(sourceId => {
          if (!current.playback.sourceTracksParams[sourceId]) audio.removeSource(sourceId)
        })
      lastTrackPlaybacks[trackId] = current
    })

    if (lastState) {
      const unloadActions: Action<any>[] = []
      lastTrackIds.forEach(trackId => {
        if (!trackIds.includes(trackId)) {
          //track should be unloaded
          audio.removeMixTrack(trackId) //remove mixTrack

          const source = currentState.sources[trackId],
            track = currentState.live.tracks[trackId]

          if (track)
            _.keys(source.sourceTracks).forEach(sourceTrackId => {
              if (source.sourceTracks[sourceTrackId].loaded) {
                audio.removeSource(sourceTrackId)
                unloadActions.push(
                  Actions.didLoadTrackSource({
                    sourceId: trackId,
                    sourceTrackId,
                    loaded: false,
                  })
                )
              }
            })
        }
      })
      if (unloadActions.length)
        store.dispatch(batchActions(unloadActions, 'UNLOAD_TRACKS'))
    }

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
