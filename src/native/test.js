const path = require('path')
const fs = require('fs')
const wav = require('node-wav')
const _ = require('lodash')
const audio = require(path.resolve(__dirname, '../../build/Release/audio.node'))

const RATE = 44100

audio.init('./')

const src = './lib/test/bench.wav'

const A = wav.decode(fs.readFileSync(src)).channelData

const [vocal, instru] = _.chunk(audio.separateSource(A), 2)

const ssize = 5.41 * RATE /2

audio.addSource('mysource', vocal)
audio.setMixTrack('mytrack', {
  sourceId: 'mysource',
  chunks: [0, ssize, ssize, ssize],
  nextChunks: [ ssize*2, ssize],
  nextAtChunk: false,
  playing: true,
  muted: false
})

audio.updatePlayback({
  period: RATE * 5.5/2,
  volume: 0.5,
  playing: true,
})

audio.start()

setInterval(() => {
  console.log(audio.getTiming().tracks['mytrack'])
}, 100)
