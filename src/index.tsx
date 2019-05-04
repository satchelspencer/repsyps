import 'babel-polyfill'

import React from 'react'
import ReactDOM from 'react-dom'
import { StoreContext } from 'redux-react-hook'
import ctyled from 'ctyled'

import App from './components/app'
import store from './redux/store'
import * as Actions from './redux/actions'

function getAudioFromURL(url, context) {
  return fetch(url)
    .then(res => res.arrayBuffer())
    .then(buff => context.decodeAudioData(buff))
}

async function init() {
  const context = new AudioContext()

  const marku = await getAudioFromURL(require('file-loader!../assets/after.mp3'), context)

  const quant = await getAudioFromURL(require('file-loader!../assets/quant.mp3'), context)

  store.dispatch(
    Actions.updateMixState({
      length: 44100 * 4,
      frac: 0,
      on: false,
    })
  )

  store.dispatch(
    Actions.addTrack({
      id: 'marku',
      name: 'marku',
      buffer: marku,
    })
  )
  store.dispatch(
    Actions.updateTrackPlayback({
      id: 'marku',
      playback: {
        on: true,
        //start: Math.floor((1 * 60 + 23.71) * 44100),
        //length: Math.floor(3.76 * 44100),
      },
      immediate: true,
    })
  )

  store.dispatch(
    Actions.addTrack({
      id: 'quant',
      name: 'quant',
      buffer: quant,
    })
  )
  store.dispatch(
    Actions.updateTrackPlayback({
      id: 'quant',
      playback: {
        on: false,
        start: Math.floor((12.33 + 0) * 44100),
        length: Math.floor(3.68 * 44100),
      },
      immediate: true,
    })
  )


  // store.dispatch(
  //   Actions.addTrack({
  //     id: 'quant2',
  //     name: 'quant',
  //     buffer: quant,
  //   })
  // )
  // store.dispatch(
  //   Actions.updateTrackPlayback({
  //     id: 'quant2',
  //     playback: {
  //       on: true,
  //       start: Math.floor((12.33 - 3.68*2) * 44100),
  //       length: Math.floor(3.68 * 44100),
  //     },
  //     immediate: true,
  //   })
  // )

  // setTimeout(() => {
  //   console.log('ay')
  //   store.dispatch(
  //     Actions.updateMixState({
  //       length: 44100*4,
  //       frac: 0,
  //       on: true
  //     })
  //   )
  // }, 5000)

  ReactDOM.render(
    <StoreContext.Provider value={store}>
      <App />
    </StoreContext.Provider>,
    document.getElementById('root')
  )
}
init()
