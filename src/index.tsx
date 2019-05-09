import 'babel-polyfill'

import React from 'react'
import ReactDOM from 'react-dom'
import { StoreContext } from 'redux-react-hook'
import * as _ from 'lodash'

import App from './components/app'
import store from './redux/store'
import * as Actions from './redux/actions'

// function getAudioFromURL(url, context) {
//   return fetch(url)
//     .then(res => res.arrayBuffer())
//     .then(buff => context.decodeAudioData(buff))
// }

async function init() {
  const context = new AudioContext()

  window.ondragover = e => {
    e.preventDefault()
  }
  window.ondrop = e => {
    e.preventDefault()
    const file = e.dataTransfer.files[0],
      reader = new FileReader()
    reader.onload = async (e: any) => {
      const audioBuff = await context.decodeAudioData(e.target.result),
        id = _.snakeCase(file.name) + new Date().getTime()
      store.dispatch(
        Actions.addTrack({
          id: id,
          name: file.name,
          buffer: audioBuff,
        })
      )
      store.dispatch(Actions.selectTrackExclusive(id))
    }
    reader.readAsArrayBuffer(file)
  }

  store.dispatch(
    Actions.updateMixState({
      length: 110336,
      frac: 0,
      on: true,
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
