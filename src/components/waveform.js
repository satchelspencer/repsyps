import React, { useRef, useEffect, useMemo } from 'react'
import ctyled from 'ctyled'
import _ from 'lodash'
import getImpulses, { binSize } from '../dsp/impulse-detect'

const Canvas = ctyled.canvas.styles({}).extend`
  position:absolute;
`
//scale is samples per pixel

function WaveformChunk(props) {
  let { buffer, impulses, scale, start, end, offset, zooming, minMaxes } = props
  const height = 200
  const size = (end - start) / scale
  const canvasRef = useRef()
  const ctxt = useRef()
  useEffect(() => {
    ctxt.current = canvasRef.current.getContext('2d')
    ctxt.current.scale(2, 2)
  }, [])

  useEffect(() => {
    const ctx = ctxt.current
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, 1000, height)
    ctx.strokeStyle = 'black'
    ctx.beginPath()


    const minMaxIndex = Math.floor(Math.log2(scale))-1,
    minMaxSize = Math.pow(2, minMaxIndex+1),
    minMax = minMaxes[minMaxIndex]

    //console.log(minMaxIndex, minMaxSize, minMax)

    for (let i = 0; i < size; i++) {

      let iStart = start + i*scale
      const minMaxSample = Math.floor(iStart/minMaxSize)
      const maxp = minMax[1][minMaxSample], maxn = minMax[0][minMaxSample]
      
      if(maxp) ctx.lineTo(i, maxp * (height / 2) + height / 2)
      if(maxn) ctx.lineTo(i, maxn * (height / 2) + height / 2)
    }
    ctx.stroke()

    ctx.strokeStyle = 'rgba(255,0,0,0.2)'

    for (let i = Math.floor(start / binSize); i < Math.floor(end / binSize); i++) {
      const value = impulses[i],
        x = (i * binSize - start) / scale
      if (value > 0.1) {
        ctx.beginPath()
        ctx.lineTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
    }

    ctx.strokeStyle = 'cyan'
    ctx.beginPath()
    for (let i = Math.floor(start / binSize); i < Math.floor(end / binSize); i++) {
      const value = impulses[i],
        x = (i * binSize - start) / scale
      ctx.lineTo(x, -value * (height / 2) + height / 2)
    }
    ctx.stroke()
  }, [buffer, scale, zooming])
  return (
    <Canvas
      inRef={canvasRef}
      width={size * 2}
      height={height * 2}
      style={{ width: size, height: '100%', left: offset }}
    />
  )
}

const WaveformContainer = ctyled.div.styles({
  height: 20,
  flex: 'none',
})

export default function Waveform(props) {
  let { buffer, scale, start, end, zooming, minMaxes } = props
  scale = Math.floor(scale)
  const width = buffer.length / scale

  let xdiff = 0
  if (zooming) {
    const currentCenter = (start + zooming.width / 2) * scale
    const samplediff = currentCenter - zooming.center
    xdiff = samplediff / scale
  }
  start -= xdiff
  end -= xdiff

  //console.log('dx', xdiff)

  const chunkSize = 1000,
    chunkLen = chunkSize * scale

  const minRender = (start - chunkSize * 1) / chunkSize,
    maxRender = (end + chunkSize * 1) / chunkSize

  const impulses = useMemo(() => getImpulses(buffer), [buffer])

  return (
    <WaveformContainer style={{ width, marginLeft: xdiff }}>
      {_.range(Math.ceil(width / chunkSize)).map(i => {
        return (
          i > minRender &&
          i < maxRender && (
            <WaveformChunk
              key={i}
              buffer={props.buffer}
              impulses={impulses}
              minMaxes={minMaxes}
              scale={scale}
              start={i * chunkLen}
              end={(i + 1) * chunkLen}
              offset={i * chunkSize}
              zooming={!!zooming}
            />
          )
        )
      })}
    </WaveformContainer>
  )
}
