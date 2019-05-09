import * as Types from '../redux/types'

/* get a subarray of audio, wrapping inside the playback/nextPlayback */
export default function getModularSubarray(
  array: Float32Array, //source audio
  sstart: number, //sample start
  send: number, //sample end
  playback: Types.PlaybackState,
  nextPlayback: Types.PlaybackState
) {
  /*end of chunk of current playback */
  const end = playback.length ? playback.start + playback.length : array.length
  if (send <= end || !playback.length) return array.subarray(sstart, send)
  //subarray was inside chunk
  else {
    //subarray exits chunk, wrap around
    const next = nextPlayback || playback,
      out = new Float32Array(send - sstart),
      tail = array.subarray(sstart, end),
      head = array.subarray(next.start, next.start + (send - end))

    for (let i = 0; i < out.length; i++) {
      if (i < tail.length) out[i] = tail[i]
      else out[i] = head[i - tail.length]
    }
    return out
  }
}
