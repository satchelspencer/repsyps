import React, { useRef, useEffect } from 'react'
import ctyled from 'ctyled'
import _ from 'lodash'
import { FFT } from '../dsp/dsp'

var fft = new FFT(512, 44100)

const Canvas = ctyled.canvas.styles({}).extend`
  position:absolute;
`

//scale is samples per pixel

function WaveformChunk({ buffer, scale, start, end, offset }) {
  const size = (end - start) / scale
  const canvasRef = useRef()
  const ctxt = useRef()
  useEffect(() => {
    ctxt.current = canvasRef.current.getContext('2d')
    ctxt.current.scale(2, 2)
  }, [])
  useEffect(() => {
    const ctx = ctxt.current
    //ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, 10000, 10000)
    ctx.strokeStyle = '#b59393'
    ctx.beginPath()
    for (let i = 0; i < size; i++) {
      let maxp = 0,
        maxn = 0
      let sump = 0,
        pcount = 0,
        sumn = 0,
        ncount = 0

      const step = Math.ceil(scale / 20)

      for (let j = 0; j < scale; j += Math.ceil(Math.random() * step)) {
        let sample = buffer[start + i * scale + j]
        if (sample > 0) {
          if (sample > maxp) maxp = sample
          sump += sample
          pcount++
        }
        if (sample < 0) {
          if (sample < maxn) maxn = sample
          sumn += sample
          ncount++
        }
      }
      const avgp = sump / pcount,
        avgn = sumn / ncount

      if (avgp) ctx.lineTo(i, avgp * 100 + 100)
      if (avgn) ctx.lineTo(i, avgn * 100 + 100)
    }
    ctx.stroke()

    const binSize = 512,
      stepSize = 512
    let bins = []
    let lastVari = 0
    for (let i = start; i < end + stepSize; i += stepSize) {
      fft.forward(buffer.subarray(i, i + binSize))
      const mag = new Float64Array(binSize)
      let sum = 0
      for (let x = 0; x < binSize; x++) {
        const m = Math.sqrt(fft.real[x] * fft.real[x] + fft.imag[x] * fft.imag[x])
        mag[x] = m
        sum += m
      }
      const mean = sum / binSize
      let diff = 0
      for (let x = 0; x < binSize; x++) {
        diff += Math.abs(mean - mag[x])
      }
      const vari = diff/binSize
      const dvari = vari-lastVari
      lastVari = vari
      // const x = Math.floor((i - start) / scale)
      // let max = 0,
      //   sum = 0
      // for (let j = 0; j < binSize; j++) {
      //   const sample = Math.abs(buffer[i + j])
      //   if (sample > max) max = sample
      //   sum += sample
      // }
      // const avg = sum / binSize
      // const diff = Math.abs(max - lastMax)
      // lastMax = max
      // bins.push(diff)
      bins.push(Math.max(dvari/2, 0))
    }

    bins = bins.map((value, i) => {
      const scanRange = 5
      let isMax = true
      for(let d=-scanRange;d<scanRange;d++){
        if(bins[i+d] && bins[i+d] > value) isMax = false
      }
      return isMax?value:0
    })

    ctx.strokeStyle = 'cyan'
    ctx.beginPath()
    bins.forEach((value, i) => {
      const x = (i * binSize) / scale
      ctx.lineTo(x, -value * 100 + 100)
    })
    ctx.stroke()
  }, [buffer, scale])
  return (
    <Canvas
      inRef={canvasRef}
      width={size * 2}
      height={400}
      style={{ width: size, height: '100%', left: offset }}
    />
  )
}

const WaveformContainer = ctyled.div.styles({
  height: 10,
  border: 1,
  flex: 'none',
})

// const WaveformCanvas = ctyled.canvas.attrs({offset: 0}).styles({
//   bg: true,
//   color: c => c.invert()
// }).extend`
//   position:absolute;
//   height:100%;
//   top:0;
//   left:${(_,{offset}) => offset}px;
// `

export default function Waveform({ buffer, scale, start, end }) {
  const width = buffer.length / scale
  const chunkSize = 1000,
    chunkLen = chunkSize * scale

  const minRender = (start - chunkSize) / chunkSize,
    maxRender = (end + chunkSize) / chunkSize

  return (
    <WaveformContainer style={{ width }}>
      {_.range(Math.ceil(width / chunkSize)).map(i => {
        return (
          i > minRender &&
          i < maxRender && (
            <WaveformChunk
              key={i}
              buffer={buffer}
              scale={scale}
              start={i * chunkLen}
              end={(i + 1) * chunkLen}
              offset={i * chunkSize}
            />
          )
        )
      })}
    </WaveformContainer>
  )
}
