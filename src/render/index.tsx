import React from 'react'
import ReactDOM from 'react-dom'
import _ from 'lodash'
import { StoreContext } from 'redux-react-hook'

import store from './redux/store'
import { SelectionContextProvider } from './components/selection'

import addTrack from 'render/redux/add-track'

import App from './app'


window.ondragover = e => {
  e.preventDefault()
}
window.ondrop = e => {
  e.preventDefault()
  const file = e.dataTransfer.files[0]
  addTrack(file, store.dispatch)
}

ReactDOM.render(
  <StoreContext.Provider value={store}>
    <SelectionContextProvider>
      <App />
    </SelectionContextProvider>
  </StoreContext.Provider>,
  document.getElementById('app')
)

// _.times(2, i => {
//   const f = Math.random()*100 + 50
//   const channels = _.range(2).map(() => {
//       const arr = new Float32Array(44100 * 100)
//       for (let i = 0; i < arr.length; i++) {
//         arr[i] = Math.sin(i / f) * 0.5
//       }
//       return arr
//     }),
//     id = i + ''
//   createBuffer(id, channels)
//   store.dispatch(
//     Actions.addSource({
//       sourceId: id,
//       name: id,
//       trackSources: { [id]: { name: 'Main', volume: 1 } },
//     })
//   )
//   store.dispatch(
//     Actions.setSourcePlayback({
//       sourceId: id,
//       playback: {
//         chunks: [Math.random()*44100*3, Math.random()*44100*3],
//         //playing: true
//       }
//     })
//   )
// })
