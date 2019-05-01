import pvPlayer from './pv-player'
import * as Types from '../redux/types'
import { Store } from 'redux'
import * as _ from 'lodash'


export default async function init(store: Store<Types.AppState>) {
  const context = new AudioContext()
  const bufferSize = 2048,
    frameSize = 2048
    
  const node = context.createScriptProcessor(bufferSize, 2)
  const players = {}
  let lastTracks: Types.TracksState = {}

  store.subscribe(() => {
    const tracks = store.getState().tracks
    if(lastTracks === tracks) return
    const added = _.difference(Object.keys(tracks), Object.keys(lastTracks)),
    removed = _.difference(Object.keys(lastTracks), Object.keys(tracks))

    added.forEach(id => {
      const track = tracks[id]
      const player = pvPlayer(frameSize)
      player.setState({
        ...track.playback,
        buffer: track.buffer
      })
      players[id] = player
    })

    removed.forEach(id => {
      players[id].setState({paused: true})
      delete players[id]
    })

    Object.keys(lastTracks).forEach(id => {
      const oldTrackPlayback = lastTracks[id],
      newTrack = tracks[id]
      if(oldTrackPlayback.playback !== newTrack.playback){
        players[id].setState(newTrack.playback, false)
        console.log(id, 'playback changed')
      }
    })

    lastTracks = tracks
  })

  node.onaudioprocess = e => {
    const player = players[Object.keys(players)[0]]
    player && player.process(e.outputBuffer)
  }

  node.connect(context.destination)
}