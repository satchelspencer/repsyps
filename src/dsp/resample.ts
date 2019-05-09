/* takes input array and samples it into output Cbuffer of specified len */

export default function resample(input: Float32Array, output, oLen: number) {
  const iLen = input.length,
    ratio = iLen / oLen
  for (var i = 0; i < oLen; i++) {
    output.push(input[Math.floor(i * ratio)])
  }
}
