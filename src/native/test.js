const path = require('path')
const fs = require('fs')
const wav = require('node-wav')
const audio = require(path.resolve(__dirname, '../../build/Release/audio.node'))

const RATE = 44100

audio.init()

const A = wav.decode(fs.readFileSync('/Users/satchel/Desktop/10. The Mask.wav'))
audio.addSource('mysource', A.channelData)
audio.setTrack('mytrack', {
  sourceId: 'mysource',
  chunks: [34.13 * RATE, 5.41 * RATE, 23.27 * RATE, 5.41 * RATE],
  playing: true
})

audio.updatePlayback({
  period: RATE * 5.5,
  volume: 0.5,
  playing: true,
})

audio.start()

setInterval(() => {
  console.log(audio.getDebug())
}, 100)