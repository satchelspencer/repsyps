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