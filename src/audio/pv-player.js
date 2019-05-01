import PhaseVocoder from '../dsp/phase-vocoder'
import CBuffer from '../dsp/cbuffer'

export default function pvPlayer(frameSize) {
  const pvL = new PhaseVocoder(frameSize, 44100),
    pvR = new PhaseVocoder(frameSize, 44100),
    tempBuffSize = Math.floor(frameSize * 2),
    tempBuffL = new CBuffer(tempBuffSize),
    tempBuffR = new CBuffer(tempBuffSize)

  pvL.init()
  pvR.init()

  const state = {
    buffer: null,
    start: 0,
    length: 0,
    position: 0,
    alpha: 1,
    paused: false,
  }

  let nextState = null

  function getModularSubarray(array, sstart, send, nextArray) {
    const end = state.start + state.length
    if (send <= end) return array.subarray(sstart, send)
    else {
      const out = new Float64Array(send - sstart),
        tail = array.subarray(sstart, end),
        head = nextArray
          ? nextArray.subarray(nextState.start, nextState.start + (send - end))
          : array.subarray(state.start, state.start + (send - end))

      for (let i = 0; i < out.length; i++) {
        if (i < tail.length) out[i] = tail[i]
        else out[i] = head[i - tail.length]
      }
      return out
    }
  }

  const api = {
    setState: (nstate, onEnd) => {
      if (onEnd) {
        nextState = Object.assign({}, state, nstate)
      } else {
        Object.assign(state, nstate)
        if (nstate.alpha) {
          pvL.set_alpha(nstate.alpha)
          pvR.set_alpha(nstate.alpha)
        }
      }
    },
    process: outputAudioBuffer => {
      let outputPos = 0
      const outputLen = outputAudioBuffer.length,
        outputL = outputAudioBuffer.getChannelData(0),
        outputR = outputAudioBuffer.getChannelData(1)

      if (state.paused) {
        outputL.fill(0)
        outputR.fill(0)
        return
      }

      while (tempBuffL.size > 0 && outputPos < outputLen) {
        outputL[outputPos] = tempBuffL.shift()
        outputR[outputPos] = tempBuffR.shift()
        outputPos++
      }

      if (outputPos === outputLen) return

      const inputL = state.buffer.getChannelData(0),
        inputR = state.buffer.getChannelData(1),
        nextInputL = nextState && nextState.buffer.getChannelData(0),
        nextInputR = nextState && nextState.buffer.getChannelData(1)

      while (outputPos < outputLen) {
        if (state.position < outputAudioBuffer.length && nextState) {
          Object.assign(state, nextState)
          if (nextState.alpha) {
            pvL.set_alpha(nextState.alpha)
            pvR.set_alpha(nextState.alpha)
          }
          nextState = null
        }

        const inputStart = state.start + state.position,
          inputEnd = inputStart + frameSize,
          inputFrameL = getModularSubarray(inputL, inputStart, inputEnd, nextInputL),
          inputFrameR = getModularSubarray(inputR, inputStart, inputEnd, nextInputR)

        pvL.process(inputFrameL, tempBuffL)
        pvR.process(inputFrameR, tempBuffR)

        for (let i = outputPos; tempBuffL.size > 0 && i < outputLen; i++) {
          outputL[i] = tempBuffL.shift()
          outputR[i] = tempBuffR.shift()
        }

        outputPos += pvL.get_synthesis_hop()
        state.position = (state.position + pvL.get_analysis_hop()) % state.length
        if (nextState) nextState.position = state.position
      }
    },
  }
  return api
}
