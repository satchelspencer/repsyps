const path = require('path')
const fs = require('fs')
const wav = require('node-wav')
const _ = require('lodash')
const audio = require(path.resolve(__dirname, '../../build/Release/audio.node'))
const pathUtils = require('path')

const RATE = 44100

async function init() {
  audio.init('./')

  const outputs = audio.getOutputs(),
    defaultIndex = audio.getDefaultOutput()
  console.log(outputs, defaultIndex)

  const mp3 = '/Users/satchel/Downloads/Flava in Ya Ear.mp3',
    stem = '/Users/satchel/Downloads/STEMS FINAL/VH_SpaceBlapz.stem.mp4',
    mono = '/Users/satchel/Downloads/IMG_1177.MOV',
    long = '/Users/satchel/Music/Bonobo/Mixes/BONOBO_BoilerRoomMix.mp3',
    wavd = '/Users/satchel/Downloads/bigl.wav',
    short = './lib/test/bench.wav',
    aac = './lib/test/test_out.aac',
    broken = './lib/test/invalid.mp3'

  const src = './lib/test/bench.wav'
  const ssize = (5.41 * RATE) / 2

  const ids = await audio.loadSource(short, 'mysource')
  console.log(ids)
  // console.log('exp', audio.exportSource('./lib/test/test_out.m4a', 'mysource'))

  // audio.loadSource('./lib/test/test_out.m4a', 'mysourceaac')

  audio.separateSource('mysource')

  const dest = new Float32Array(256)
  audio.getWaveform('mysource', -2000, 200, dest)
  console.log(dest)
  console.log(audio.getImpulses('mysource'))

  audio.setMixTrack('mytrack', {
    playback: {
      chunks: [0, ssize, ssize, ssize],
      nextAtChunk: false,
      playing: true,
      muted: false,
      filter: 0.5,
      volume: 1,
      sourceTracksParams: {
        mysource: {
          volume: 1,
          offset: 0,
        },
      },
    },
    nextPlayback: {
      chunks: [ssize * 2, ssize],
      nextAtChunk: false,
      playing: true,
      muted: false,
      filter: 0.1,
      volume: 1,
      sourceTracksParams: {
        mysource_vocal: {
          volume: 0.8,
          offset: 0,
        },
        mysource_instru: {
          volume: 0.1,
          offset: 0,
        },
      },
    },
  })

  audio.updatePlayback({
    period: (RATE * 5.5) / 2,
    volume: 0.5,
    playing: true,
  })

  audio.start(defaultIndex)

  setTimeout(() => audio.start(7), 3000)

  let i = 0
  setInterval(() => {
    console.log(audio.getTiming().tracks)
    i++
  }, 100)
}
init()
