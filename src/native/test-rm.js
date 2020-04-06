const path = require('path')
const fs = require('fs')
const wav = require('node-wav')
const _ = require('lodash')
const audio = require(path.resolve(__dirname, '../../build/Release/audio.node'))
const pathUtils = require('path')

const RATE = 44100

audio.init('./')

const short = './lib/test/bench.wav'
const ssize = (5.41 * RATE) / 2

let i = 0
async function doeet(){
  console.log(i++)
  const sourceId = Math.random().toString(16).substr(2),
    trackId = Math.random().toString(16).substr(2)
  await audio.loadSource(short, sourceId)
  audio.setMixTrack(trackId, {
    playback: {
      chunks: [0, ssize, ssize, ssize],
      nextAtChunk: false,
      playing: true,
      muted: false,
      filter: 0.5,
      volume: 1,
      sourceTracksParams: {
        [sourceId]: {
          volume: 1,
          offset: 0,
        },
      },
    },
    nextPlayback: null,
  })
  setTimeout(() => {
    audio.removeMixTrack(trackId)
    audio.removeSource(sourceId)
    doeet()
  }, 200)
}
doeet()

audio.updatePlayback({
  period: (RATE * 5.5) / 2,
  volume: 0.5,
  playing: true,
})

audio.start()

setInterval(() => {
  console.log(audio.getTiming().tracks)
}, 100)
