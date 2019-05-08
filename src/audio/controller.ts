//import pvPlayer, { PvPlayerApi } from './pv-player'
import * as Types from '../redux/types'
import * as Actions from '../redux/actions'
import { Store } from 'redux'
import * as _ from 'lodash'
import pvWorkletUrl from './pv-mixer.worklet'

export default async function init(store: Store<Types.AppState>) {
  const context = new AudioContext()

  let lastTracks: Types.TracksState = {},
    lastMixState: Partial<Types.MixState> = {}

  context.audioWorklet.addModule(pvWorkletUrl).then(() => {
    let node = new AudioWorkletNode(context, 'pv-mixer-processor', {
      outputChannelCount: [2],
    })
    const throttlePostMessage = _.throttle(body => node.port.postMessage(body), 200)
    node.port.onmessage = event => {
      if (event.data.type === 'apply_next') {
        store.dispatch(Actions.applyNextPlayback({ id: event.data.id }))
      } else if (event.data.type === 'frac_update') {
        lastMixState.frac = event.data.frac
        store.dispatch(
          Actions.updateTrackTime({
            frac: event.data.frac,
            trackPositions: event.data.positions,
          })
        )
      }
    }
    node.connect(context.destination)

    store.subscribe(() => {
      const mixState = store.getState().mix
      if (!_.isEqual(mixState, lastMixState)) {
        const diff = {}
        Object.keys(mixState).forEach(key => {
          if (mixState[key] !== lastMixState[key]) diff[key] = mixState[key]
        })
        if (Object.keys(diff).length)
          throttlePostMessage({
            type: 'updateMixState',
            mix: diff,
          })
        lastMixState = mixState
      }

      const tracks = store.getState().tracks
      if (lastTracks === tracks) return
      const added = _.difference(Object.keys(tracks), Object.keys(lastTracks)),
        removed = _.difference(Object.keys(lastTracks), Object.keys(tracks))

      added.forEach(id => {
        const track = tracks[id]
        node.port.postMessage({
          type: 'add',
          id,
          audio: [track.buffer.getChannelData(0), track.buffer.getChannelData(1)],
          playback: track.playback,
        })
      })

      removed.forEach(id => {
        console.log('remove', id)
      })

      Object.keys(lastTracks).forEach(id => {
        const oldTrackPlayback = lastTracks[id],
          newTrack = tracks[id]
        if (oldTrackPlayback.playback !== newTrack.playback)
          throttlePostMessage({
            type: 'updatePlayback',
            id: id,
            playback: newTrack.playback,
            immediate: true,
          })
        if (
          newTrack.nextPlayback &&
          oldTrackPlayback.nextPlayback !== newTrack.nextPlayback
        )
          setTimeout(() => {
            node.port.postMessage({
              type: 'updatePlayback',
              id: id,
              playback: newTrack.nextPlayback[0],
              immediate: false,
            })
          }, 100)
      })

      lastTracks = tracks
    })
  })
}
