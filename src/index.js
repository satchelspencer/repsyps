import 'babel-polyfill'

import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'

import pvPlayer from './pv-player'
import Waveform from './components/waveform'
import ScrollContainer from './components/scroll-container'
import store from './redux/store'

function getAudioFromURL(url, context) {
  return fetch(url)
    .then(res => res.arrayBuffer())
    .then(buff => context.decodeAudioData(buff))
}

async function init() {
  const groove = require('file-loader!../assets/quant.mp3')
  const loop = require('file-loader!../assets/loops.mp3')

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
    alpha: 1.3,
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
        paused: true
      },
      0
    )
    if (e.key === 'u')
    pv.setState(
      {
        paused: false
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

  ReactDOM.render(
    <Provider store={store}>
      <ScrollContainer>
        {(width, offset) => {
          return (
            <Waveform
              buffer={a.getChannelData(1)}
              scale={300}
              start={offset}
              end={offset + width}
            />
          )
        }}
      </ScrollContainer>
    </Provider>,
    document.getElementById('root')
  )
}
init()
