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
  const groove = require('file-loader!../assets/marku.mp3')
  const loop = require('file-loader!../assets/da.mp3')
  const manback = require('file-loader!../assets/manback.mp3')

  const a = await getAudioFromURL(groove, context),
    l = await getAudioFromURL(loop, context),
    m = await getAudioFromURL(manback, context)

  console.log('add 1')
  store.dispatch(
    Actions.addTrack({
      id: '1',
      name: 'marku',
      buffer: a,
    })
  )

  setTimeout(() => {
    console.log('start')
    store.dispatch(
      Actions.updateTrackPlayback({
        id: '1',
        playback: { paused: false },
        immediate: true,
      })
    )
  }, 3000)

  ReactDOM.render(
    <StoreContext.Provider value={store}>
      <App />
    </StoreContext.Provider>,
    document.getElementById('root')
  )
}
init()
