import { Store, Action } from 'redux'
import _ from 'lodash'
import { remote } from 'electron'
import { batchActions } from 'redux-batched-actions'
import pathUtils from 'path'

import * as Types from 'render/util/types'
import audio from 'render/util/audio'
import * as Actions from './actions'
import * as Selectors from './selectors'
import diff from 'render/util/diff'
import reducer from 'render/redux/reducer'
import isEqual from 'render/util/is-equal'
import { updateTiming, removeTrackTimings } from 'render/components/timing'

export const UPDATE_PERIODS = {
    high: 17,
    medium: 40,
    low: 100,
  },
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

  const currentOutput = store.getState().output.current,
    availableOutputs = audio.getOutputs(),
    matchingOutput = availableOutputs.find((output) => output.index === currentOutput),
    defaultOutput = audio.getDefaultOutput(),
    currentOut = matchingOutput ? currentOutput : defaultOutput

  store.dispatch(
    Actions.setOutputs({
      default: defaultOutput,
      devices: availableOutputs,
      current: currentOut,
    })
  )

  const handleUpdate = () => {
    const currentState = store.getState(),
      trackIds = Selectors.getActiveTrackIds(currentState),
      lastTrackIds = lastState ? Selectors.getActiveTrackIds(lastState) : [],
      playback = Selectors.getGlobalPlayback(currentState),
      currentPath = currentState.save.path || ''

    if (!lastState || !isEqual(playback, lastGlobalPlayback)) {
      const change = diff(!lastState ? {} : lastGlobalPlayback, playback)
      //console.log('update playback', change)
      audio.updatePlayback(change)
      lastGlobalPlayback = playback
    }

    trackIds.forEach((trackId) => {
      const trackIsNew = !lastState || !lastTrackIds.includes(trackId),
        source = currentState.sources[trackId]

      if (trackIsNew) playbackSelectors[trackId] = Selectors.makeGetTrackPlayback(trackId)
      const prev = lastTrackPlaybacks[trackId],
        current = playbackSelectors[trackId](currentState, trackId)
      _.keys(current.playback.sourceTracksParams).forEach(async (sourceId) => {
        const sourceTrack = source.sourceTracks[sourceId],
          sourceIsNew = !sourceTrack.loaded

        if (
          sourceIsNew &&
          !loadingSources[sourceId] &&
          !sourceTrack.missing &&
          !sourceTrack.streamIndex
        ) {
          const trackName = source.name,
            sourcePath = sourceTrack.source,
            isAbsolute = sourcePath && pathUtils.isAbsolute(sourcePath),
            absSorucePath =
              sourcePath &&
              (isAbsolute
                ? sourcePath
                : pathUtils.resolve(pathUtils.dirname(currentPath), sourcePath))

          loadingSources[sourceId] = true
          const loadedIds =
            sourcePath && (await audio.loadSource(absSorucePath, sourceId))

          if (loadedIds && loadedIds.length) {
            const newTrackActions: Action<any>[] = []
            loadedIds.forEach((sourceTrackId, index) => {
              newTrackActions.push(
                Actions.didLoadTrackSource({
                  sourceId: trackId,
                  sourceTrackId: sourceId,
                  loaded: true,
                  missing: false,
                })
              )
              if (!source.sourceTracks[sourceTrackId]) {
                newTrackActions.push(
                  Actions.createTrackSource({
                    sourceId: trackId,
                    sourceTrackId,
                    sourceTrack: {
                      name: index + ':' + trackName,
                      source: sourcePath,
                      loaded: true,
                      missing: false,
                      streamIndex: index, //only first source is primary
                      base: null,
                    },
                  })
                )
              }
            })
            store.dispatch(batchActions(newTrackActions, 'LOAD_TRACK'))
            audio.setMixTrack(trackId, current)
          } else {
            store.dispatch(
              Actions.didLoadTrackSource({
                sourceId: trackId,
                sourceTrackId: sourceId,
                loaded: false,
                missing: true,
              })
            )
          }
          delete loadingSources[sourceId]
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
        audio.setMixTrack(trackId, change)
      }

      if (!trackIsNew)
        _.keys(prev.playback.sourceTracksParams).forEach((sourceId) => {
          if (!current.playback.sourceTracksParams[sourceId]) audio.removeSource(sourceId)
        })
      lastTrackPlaybacks[trackId] = current
    })

    if (lastState) {
      const unloadActions: Action<any>[] = [],
        removedIds: string[] = []
      lastTrackIds.forEach((trackId) => {
        if (!trackIds.includes(trackId)) {
          //track should be unloaded
          audio.removeMixTrack(trackId) //remove mixTrack
          removedIds.push(trackId)

          const source = currentState.sources[trackId],
            track = currentState.live.tracks[trackId]

          if (track)
            _.keys(source.sourceTracks).forEach((sourceTrackId) => {
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

      if (removedIds.length) removeTrackTimings(removedIds)
    }

    /* change audio output */
    if (!lastState || lastState.output.current !== currentState.output.current)
      audio.start(currentState.output.current)

    if (!lastState || lastState.output.preview !== currentState.output.preview) {
      if (currentState.output.preview === null) audio.stopPreview()
      else audio.startPreview(currentState.output.preview)
    }

    lastState = currentState
  }
  store.subscribe(handleUpdate)
  handleUpdate()

  function update() {
    let start = new Date().getTime()
    lastState = store.getState()
    if (lastState && lastState.playback.playing) {
      const currentTiming = audio.getTiming()
      let needsUpdate = _.some(lastState.live.tracks, (track, trackId) => {
        const trackTiming = currentTiming.tracks[trackId]
        if (!trackTiming) return false
        const didAdvanceChunk =
            track.playback.chunkIndex !== trackTiming.playback.chunkIndex ||
            track.playback.playing !== track.playback.playing,
          didAdvancePlayback = track.nextPlayback && !trackTiming.nextPlayback

        return didAdvanceChunk || (didAdvancePlayback && track.nextCueIndex !== -1)
      })
      if (needsUpdate) {
        /* override last state so this change won't be sent back to where it came from */
        lastState = reducer(
          lastState,
          Actions.updateTime({ timing: currentTiming, commit: false })
        )
        store.dispatch(Actions.updateTime({ timing: currentTiming, commit: true }))
      }
      updateTiming(currentTiming)
    }
    setTimeout(
      update,
      Math.max(
        UPDATE_PERIODS[lastState.settings.updateRate] - (new Date().getTime() - start),
        0
      )
    )
  }
  update()
}
