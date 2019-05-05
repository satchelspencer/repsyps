import CBuffer from '../dsp/cbuffer'
import PhaseVocoder from '../dsp/phase-vocoder'
import * as _ from 'lodash'

const frameSize = 2048,
  tempBuffSize = Math.floor(frameSize * 2)

function getModularSubarray(array, sstart, send, playback) {
  const end = playback.length ? playback.start + playback.length : array.length
  if (send <= end || !playback.length) return array.subarray(sstart, send)
  else {
    const out = new Float32Array(send - sstart),
      tail = array.subarray(sstart, end),
      head = array.subarray(playback.start, playback.start + (send - end))

    for (let i = 0; i < out.length; i++) {
      if (i < tail.length) out[i] = tail[i]
      else out[i] = head[i - tail.length]
    }
    return out
  }
}

class PvProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.tracks = {}
    this.fracUpdate = () => {
      const positions = _.pickBy(
        _.mapValues(this.tracks, track => track.position),
        (_, trackId) => this.tracks[trackId].playback.on
      )
      this.port.postMessage({ type: 'frac_update', frac: this.frac, positions })
    }
    this.frameNumber = 0
    this.frac = 0
    this.time = 0
    this.on = false
    this.port.onmessage = event => {
      if (event.data.type === 'add') {
        const { id, audio, playback } = event.data,
          pvL = new PhaseVocoder(frameSize, 44100),
          pvR = new PhaseVocoder(frameSize, 44100)

        pvL.init()
        pvR.init()

        const alpha =
          (playback.length ? this.time / playback.length : 1) * (playback.alpha || 1)
        pvL.set_alpha(alpha)
        pvR.set_alpha(alpha)

        this.tracks[id] = {
          pvL,
          pvR,
          tempBuffL: new CBuffer(tempBuffSize),
          tempBuffR: new CBuffer(tempBuffSize),
          audio,
          playback,
          nextPlayback: null,
          position: playback.length ? this.frac * playback.length : 0,
          out: 0,
        }
        console.log('adding' + ' ' + id + ' ' + this.frac)
      } else if (event.data.type === 'updatePlayback') {
        const { id, playback, immediate } = event.data,
          track = this.tracks[id]
        if (immediate) {
          track.playback = { ...track.playback, ...playback }
          track.position = playback.length
            ? (this.frac / (track.playback.alpha || 1)) * track.playback.length
            : 0
          const alpha =
            (playback.length ? this.time / track.playback.length : 1) *
            (track.playback.alpha || 1)
          track.pvL.set_alpha(alpha)
          track.pvR.set_alpha(alpha)
        } else track.nextPlayback = playback
      } else if (event.data.type === 'updateMixState') {
        console.log('updateMix')
        const { mix } = event.data
        if (mix.frac !== undefined) this.frac = mix.frac
        if (mix.length) this.time = mix.length
        if (mix.on !== undefined) this.on = mix.on
      }
    }
  }

  process(_, outputs) {
    const outputL = outputs[0][0],
      outputR = outputs[0][1],
      outputLen = outputL.length

    if (!this.on || !this.time) return true
    //console.log(outputs[0], outputL.length, outputR.length)

    Object.keys(this.tracks).forEach((trackId, t) => {
      const {
          pvL,
          pvR,
          tempBuffL,
          tempBuffR,
          audio,
          playback,
          nextPlayback,
          position,
        } = this.tracks[trackId],
        track = this.tracks[trackId]

      let outputPos = 0

      if (!playback.on) return

      /* empty buffer into output */
      while (tempBuffL.size > 0 && outputPos < outputLen) {
        outputL[outputPos] += tempBuffL.shift() * playback.vol
        outputR[outputPos] += tempBuffR.shift() * playback.vol
        outputPos++
      }
      if (outputPos === outputLen) return
      const [inputL, inputR] = audio

      const talpha = track.playback.alpha,
        adjustedFrac = this.frac / talpha,
        adjPos = track.position / track.playback.alpha,
        invAlpha = 1 / talpha,
        fullFrac = track.position / track.playback.length,
        fullFracRemainder = fullFrac % invAlpha,
        fullFracDiv = Math.floor(fullFrac / invAlpha),
        posByFrac = ((fullFracDiv + this.frac) / talpha) * track.playback.length

      //console.log(fullFracRemainder+' '+this.frac)
      //console.log(fullFracRemainder + ', ' + adjustedFrac+' - '+ fullFracDiv.toString())

      if (
        !track.playback.aperiodic && 
        track.playback.length &&
        this.frac > 0.1 &&
        this.frac < 0.9 &&
        track.position - posByFrac > 256
      ) {
        console.log('out?')
        if (track.out > 2) {
          console.log('correcting')
          track.position = posByFrac
          track.out = 0
        } else track.out++
      } else track.out = 0

      while (outputPos < outputLen) {
        const inputStart = playback.start + track.position,
          inputEnd = inputStart + frameSize,
          inputFrameL = getModularSubarray(inputL, inputStart, inputEnd, playback),
          inputFrameR = getModularSubarray(inputR, inputStart, inputEnd, playback)

        pvL.process(inputFrameL, tempBuffL)
        pvR.process(inputFrameR, tempBuffR)

        for (let i = outputPos; tempBuffL.size > 0 && i < outputLen; i++) {
          outputL[i] += tempBuffL.shift() * playback.vol
          outputR[i] += tempBuffR.shift() * playback.vol
        }

        outputPos += pvL.get_synthesis_hop()

        const nextPosition =
          (track.position + pvL.get_analysis_hop()) % (playback.length || Infinity)

        if (nextPosition < track.position && track.nextPlayback) {
          Object.assign(track.playback, track.nextPlayback)
          track.playback = { ...track.playback, ...track.playback }
          track.position = track.playback.length
            ? (this.frac / (track.playback.alpha || 1)) * track.playback.length
            : 0
          const alpha = (this.time / track.playback.length) * (track.playback.alpha || 1)
          pvL.set_alpha(alpha)
          pvR.set_alpha(alpha)
          track.nextPlayback = null
          this.port.postMessage({ type: 'apply_next', id: trackId })
        }
        track.position = nextPosition
      }
    })
    this.frac = (this.frac + outputLen / this.time) % 1
    this.frameNumber++
    if (this.frameNumber % 10 === 0) this.fracUpdate()
    return true
  }
}

registerProcessor('pv-mixer-processor', PvProcessor)
