const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const audio = require(path.resolve(__dirname, '../../build/Release/audio.node'))

const RATE = 44100

const sources = {
    mp3: './lib/test/silent.mp3',
    stem: './lib/test/stem.stem.mp4',
    mono: './lib/test/mono.wav',
    short: './lib/test/bench.wav',
    tone: './lib/test/tone.wav',
    aac: './lib/test/test_out.aac',
    broken: './lib/test/invalid.mp3',
  },
  ssize = (5.41 * RATE) / 2,
  source = sources[process.argv[3] || 'short']

const tests = {
  default: async () => {
    audio.init('./')
    console.log('outputs', audio.getOutputs())
    await audio.loadSource(source, 'mysource')

    audio.setMixTrack('mytrack', {
      playback: {
        chunks: [0, ssize, ssize, ssize],
        playing: true,
        sourceTracksParams: {
          mysource: {
            volume: 1,
            offset: 0,
          },
        },
      },
      nextPlayback: null,
    })

    audio.updatePlayback({
      period: ssize * 1.2,
      volume: 0.5,
      playing: true,
    })

    audio.start(audio.getDefaultOutput())
  },
  sep: async () => {
    audio.init('./')
    await audio.loadSource(source, 'mysource')
    console.log('separating...')
    audio.separateSource('mysource')

    audio.setMixTrack('mytrack', {
      playback: {
        chunks: [0, ssize, ssize, ssize],
        playing: true,
        sourceTracksParams: {
          mysource_vocal: {
            volume: 1,
            offset: 0,
          },
        },
      },
      nextPlayback: null,
    })

    audio.updatePlayback({
      period: ssize * 1.2,
      volume: 0.5,
      playing: true,
    })

    audio.start(audio.getDefaultOutput())
  },
  wave: async () => {
    audio.init('./')
    await audio.loadSource(source, 'mysource')
    const dest = new Float32Array(256)
    audio.getWaveform('mysource', -2000, 200, dest)
    console.log(dest)
  },
  imp: async () => {
    audio.init('./')
    await audio.loadSource(source, 'mysource')
    console.log(audio.getImpulses('mysource'))
  },
  next: async () => {
    audio.init('./')
    console.log('outputs', audio.getOutputs())
    await audio.loadSource(source, 'mysource')

    audio.setMixTrack('mytrack', {
      playback: {
        chunks: [0, ssize, ssize, ssize],
        playing: true,
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
        volume: 1,
        sourceTracksParams: {
          mysource: {
            volume: 1,
            offset: 0,
          },
        },
      },
    })

    audio.updatePlayback({
      period: ssize * 0.8,
      volume: 0.5,
      playing: true,
    })

    audio.start(audio.getDefaultOutput())
  },
  rm: async () => {
    audio.init('./')

    let i = 0
    async function reload() {
      console.log(i++)
      const sourceId = Math.random().toString(16).substr(2),
        trackId = Math.random().toString(16).substr(2)
      await audio.loadSource(source, sourceId)
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
        reload()
      }, 200)
    }
    reload()

    audio.updatePlayback({
      period: ssize * 1.2,
      volume: 0.5,
      playing: true,
    })

    audio.start(audio.getDefaultOutput())
  },
  restart: async () => {
    audio.init('./')
    console.log('outputs', audio.getOutputs())
    await audio.loadSource(source, 'mysource')

    audio.setMixTrack('mytrack', {
      playback: {
        chunks: [0, ssize, ssize, ssize],
        playing: true,
        sourceTracksParams: {
          mysource: {
            volume: 1,
            offset: 0,
          },
        },
      },
      nextPlayback: null,
    })

    audio.updatePlayback({
      period: ssize * 1.2,
      volume: 0.5,
      playing: true,
    })

    audio.start(audio.getDefaultOutput())

    let def = false
    setInterval(() => {
      audio.start(def ? audio.getDefaultOutput() : 6)
      def = !def
    }, 1000)
  },
}

const test = tests[process.argv[2] || 'default']
if (!test) console.log('UNKNOWN TEST:', process.argv[2])
else {
  test()
  setInterval(() => console.log(audio.getTiming().tracks), 1000)
}
