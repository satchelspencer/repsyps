import 'babel-polyfill'

import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import ctyled from 'ctyled'

import pvPlayer from './pv-player'
import Track from './components/waveform'
import store from './redux/store'

function getAudioFromURL(url, context) {
  return fetch(url)
    .then(res => res.arrayBuffer())
    .then(buff => context.decodeAudioData(buff))
}

function getMinMaxes(buffer){
  let minMaxes = []
  for (let frameSize = 2; frameSize < Math.floor(buffer.length / 2); frameSize *= 2) {
    const frameCount = Math.ceil(buffer.length / frameSize)
    const mins = new Float32Array(frameCount),
      maxes = new Float32Array(frameCount)

    const lastMinMax = minMaxes[minMaxes.length - 1]

    const prevMins = lastMinMax ? lastMinMax[0] : buffer,
      prevMaxes = lastMinMax ? lastMinMax[1] : buffer

    for (let fi = 0; fi < frameCount; fi++) {
      const start = fi * 2,
        end = (fi + 1) *2
      let min = 0,
        max = 0

      for (let i = start; i < end; i++) {
        if (prevMaxes[i] > 0 && prevMaxes[i] > max) max = prevMaxes[i]
        if (prevMins[i] < 0 && prevMins[i] < min) min = prevMins[i]
      }
      mins[fi] = min
      maxes[fi] = max
    }
    minMaxes.push([mins, maxes, frameSize])
  }
  return minMaxes
}

async function init() {
  const groove = require('file-loader!../assets/marku.mp3')
  const loop = require('file-loader!../assets/after.mp3')

  const context = new AudioContext()
  const bufferSize = 2048,
    frameSize = 2048
  const a = await getAudioFromURL(groove, context),
    l = await getAudioFromURL(loop, context)
  const node = context.createScriptProcessor(bufferSize, 2),
    pv = pvPlayer(frameSize)

  pv.setState({
    buffer: a,
    start: 136.9 * 44100,
    length: 5.52 * 44100,
    position: 0,
    alpha: 1,
  })

  window.onkeydown = e => {
    if (e.key === 'a')
      pv.setState(
        {
          start: (136.9 - 5.52 - 5.52) * 44100,
        },
        0
      )

    if (e.key === 'p')
      pv.setState(
        {
          paused: true,
        },
        0
      )
    if (e.key === 'u')
      pv.setState(
        {
          paused: false,
        },
        0
      )

    if (e.key === 'b')
      pv.setState(
        {
          start: (136.9 - 5.52) * 44100,
        },
        0
      )

    if (e.key === 'c')
      pv.setState(
        {
          start: 136.9 * 44100,
        },
        0
      )
  }

  node.onaudioprocess = e => {
    pv.process(e.outputBuffer)
  }

  node.connect(context.destination)

  const buffer = a.getChannelData(1), minMaxes = getMinMaxes(buffer)

  const loopbuffer = l.getChannelData(1), loopminMaxes = getMinMaxes(loopbuffer)

  const Wrapper = ctyled.div.styles({column: true}).extend`
    width:100%;
    height:100%;
    top:0;
    left:0;
    position:absolute;
  `

  ReactDOM.render(
    <Provider store={store}>
      <Wrapper>
        <Track buffer={buffer} minMaxes={minMaxes}/>
        <Track buffer={loopbuffer} minMaxes={loopminMaxes}/>
        </Wrapper>
    </Provider>,
    document.getElementById('root')
  )
}
init()
