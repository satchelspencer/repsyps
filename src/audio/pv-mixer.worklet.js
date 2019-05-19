import CBuffer from '../dsp/cbuffer'
import * as _ from 'lodash'

import resample from '../dsp/resample'
import getModularSubarray from '../dsp/modular-subarray'
import PhaseVocoder from '../dsp/phase-vocoder'

const FRAME_SIZE = 2048,
  RING_BUFFER_SIZE = Math.floor(FRAME_SIZE * 2),
  USE_PV = false

class PvProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.tracks = {} //current state of tracks
    this.frameNumber = 0 //output frame count
    this.frac = 0 //fraction through the current measure
    this.time = 0 //output length of measure
    this.on = false //play/paused

    this.port.onmessage = event => {
      this[event.data.type] && this[event.data.type](event.data)
    }
  }

  /* add new track and init memory and state */
  add({ id, audio, playback }) {
    const alpha =
      (playback.length ? this.time / playback.length : 1) * (playback.alpha || 1)

    let pvL, pvR
    if (USE_PV) {
      pvL = new PhaseVocoder(FRAME_SIZE, 44100)
      pvR = new PhaseVocoder(FRAME_SIZE, 44100)
      pvL.init()
      pvR.init()
      pvL.set_alpha(alpha)
      pvR.set_alpha(alpha)
    }

    this.tracks[id] = {
      pvL,
      pvR,
      tempBuffL: new CBuffer(RING_BUFFER_SIZE),
      tempBuffR: new CBuffer(RING_BUFFER_SIZE),
      audio,
      playback,
      nextPlayback: null,
      position: playback.length && !playback.aperiodic ? this.frac * playback.length : 0,
      out: 0,
      alpha,
    }
  }

  remove({ id }) {
    delete this.tracks[id]
  }

  /* update the global state of the mixer */
  updateMixState({ mix }) {
    if (mix.frac !== undefined) this.frac = mix.frac
    if (mix.length) {
      this.time = mix.length
      Object.keys(this.tracks).forEach(trackId => {
        const track = this.tracks[trackId],
          alpha = (this.time / track.playback.length) * (track.playback.alpha || 1)
        if (track.playback.aperiodic) return //dont change the speed of aperiodic tracks
        if (USE_PV) {
          track.pvL.set_alpha(alpha)
          track.pvR.set_alpha(alpha)
        }
        track.alpha = alpha
      })
    }
    if (mix.on !== undefined) this.on = mix.on
  }

  /* update the playback state of a track */
  updatePlayback({ id, playback, immediate }) {
    const track = this.tracks[id]
    if (immediate) {
      const hasTimeChange =
        playback.start !== track.playback.start ||
        playback.length !== track.playback.length ||
        playback.alpha !== track.playback.alpha ||
        playback.on !== track.playback.on

      track.playback = { ...track.playback, ...playback }
      if (hasTimeChange) {
        track.position =
          playback.length && !playback.aperiodic
            ? (this.frac / (track.playback.alpha || 1)) * track.playback.length
            : 0
        const alpha =
          (playback.length ? this.time / track.playback.length : 1) *
          (track.playback.alpha || 1)

        if (USE_PV) {
          track.pvL.set_alpha(alpha)
          track.pvR.set_alpha(alpha)
        }
        track.alpha = alpha
      }
    } else track.nextPlayback = playback
  }

  sendFracUpdate() {
    const positions = _.pickBy(
      _.mapValues(this.tracks, track => track.position),
      (_, trackId) => this.tracks[trackId].playback.on
    )
    this.port.postMessage({ type: 'frac_update', frac: this.frac, positions })
  }

  process(_, outputs) {
    const outputL = outputs[0][0],
      outputR = outputs[0][1],
      outputLen = outputL.length

    if (!this.on) return true

    /* get the output for each track */
    Object.keys(this.tracks).forEach((trackId, t) => {
      const track = this.tracks[trackId]
      if (!track.playback.on) return

      let outputPos = 0 //position into output buffer that has been filled
      /* empty old buffer into output */
      while (track.tempBuffL.size > 0 && outputPos < outputLen) {
        outputL[outputPos] += track.tempBuffL.shift() * track.playback.vol
        outputR[outputPos] += track.tempBuffR.shift() * track.playback.vol
        outputPos++
      }

      /* check that the tracks theoretical position has not drifted */
      const talpha = track.playback.alpha,
        invAlpha = 1 / talpha,
        fullFrac = track.position / track.playback.length,
        fullFracDiv = Math.floor(fullFrac / invAlpha),
        posByFrac = ((fullFracDiv + this.frac) / talpha) * track.playback.length

      if (
        !track.playback.aperiodic &&
        track.playback.length &&
        this.frac > 0.1 &&
        this.frac < 0.9 &&
        track.position - posByFrac > 256
      ) {
        if (track.out > 2) {
          // if out of sync more than twice in a row resync
          track.position = posByFrac
          track.out = 0
        } else track.out++
      } else track.out = 0

      /* now process more audio until we fill the ouput buffer */
      const [inputL, inputR] = track.audio,
        inputFrameSize = Math.floor(FRAME_SIZE / (track.alpha || 1))

      while (outputPos < outputLen) {
        const inputStart = track.playback.start + track.position,
          inputEnd = inputStart + (USE_PV ? FRAME_SIZE : inputFrameSize),
          inputFrameL = getModularSubarray(
            inputL,
            inputStart,
            inputEnd,
            track.playback,
            track.nextPlayback
          ),
          inputFrameR = getModularSubarray(
            inputR,
            inputStart,
            inputEnd,
            track.playback,
            track.nextPlayback
          )

        /* compute the time changed output into track.tempBuffL */
        if (USE_PV) {
          track.pvL.process(inputFrameL, track.tempBuffL)
          track.pvR.process(inputFrameR, track.tempBuffR)
        } else {
          resample(inputFrameL, track.tempBuffL, FRAME_SIZE)
          resample(inputFrameR, track.tempBuffR, FRAME_SIZE)
        }

        /* empty as much as we can into output */
        for (let i = outputPos; track.tempBuffL.size > 0 && i < outputLen; i++) {
          outputL[i] += track.tempBuffL.shift() * track.playback.vol
          outputR[i] += track.tempBuffR.shift() * track.playback.vol
        }

        outputPos += USE_PV ? track.pvL.get_synthesis_hop() : FRAME_SIZE //move the output pos

        /* next input position is modular to the length of the current chunk */
        const nextPosition =
          (track.position + (USE_PV ? track.pvL.get_analysis_hop() : inputFrameSize)) %
          (track.playback.length || Infinity)

        /* if we're about to start a new chunk and a nextPlayback is ready. apply it */
        if (nextPosition < track.position && track.nextPlayback) {
          Object.assign(track.playback, track.nextPlayback)
          track.playback = { ...track.playback, ...track.playback }

          const alpha = (this.time / track.playback.length) * (track.playback.alpha || 1)
          if (USE_PV) {
            track.pvL.set_alpha(alpha)
            track.pvR.set_alpha(alpha)
          }
          track.alpha = alpha
          track.nextPlayback = null
          this.port.postMessage({ type: 'apply_next', id: trackId }) //notify that the apply has happened
        }
        track.position = nextPosition
      }
    })
    this.frac = (this.frac + outputLen / this.time) % 1
    this.frameNumber++
    if (this.frameNumber % 10 === 0) this.sendFracUpdate()
    return true
  }
}

registerProcessor('pv-mixer-processor', PvProcessor)
