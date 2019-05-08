import 'babel-polyfill'

import React from 'react'
import ReactDOM from 'react-dom'
import { StoreContext } from 'redux-react-hook'

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

  const marku = await getAudioFromURL(
    require('file-loader!../assets/MortalThought.mp3'),
    context
  )

  const quant = await getAudioFromURL(require('file-loader!../assets/wtd.mp3'), context)

  store.dispatch(
    Actions.updateMixState({
      length: 110336,
      frac: 0,
      on: true,
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
    Actions.addTrack({
      id: 'quant',
      name: 'quant',
      buffer: quant,
    })
  )

  ReactDOM.render(
    <StoreContext.Provider value={store}>
      <App />
    </StoreContext.Provider>,
    document.getElementById('root')
  )
}
init()
