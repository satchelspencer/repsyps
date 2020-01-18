import React, { useEffect, useRef, useState, useMemo } from 'react'
import ReactDOM from 'react-dom'
import { ipcRenderer } from 'electron'
import _ from 'lodash'
import pathUtils from 'path'
import { StoreContext } from 'redux-react-hook'

import store from './redux/store'
import * as Actions from './redux/actions'
import App from './components/app'

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
      Actions.addSource({
        sourceId: id,
        name: file.name,
        channels: audioBuff,
      })
    )
  }
  reader.readAsArrayBuffer(file)
}

ReactDOM.render(
  <StoreContext.Provider value={store}>
    <App />
  </StoreContext.Provider>,
  document.getElementById('app')
)
