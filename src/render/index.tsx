import React from 'react'
import ReactDOM from 'react-dom'
import _ from 'lodash'
import { StoreContext } from 'redux-react-hook'

import store from './redux/store'
import * as Actions from './redux/actions'
import { SelectionContextProvider } from './components/selection'

import App from './app'

const context = new AudioContext()

window.ondragover = e => {
  e.preventDefault()
}
window.ondrop = e => {
  e.preventDefault()
  const file = e.dataTransfer.files[0],
    reader = new FileReader()
  reader.onload = async (e: any) => {
    console.log('read')
    const audioBuff = await context.decodeAudioData(e.target.result),
      id = _.snakeCase(file.name.substr(0, 15)) + new Date().getTime()
    console.log('done')
    store.dispatch(
      Actions.addSource({
        sourceId: id,
        name: file.name,
        channels: audioBuff,
      })
    )
    store.dispatch(Actions.selectSourceExclusive(id))
  }
  reader.readAsArrayBuffer(file)
  console.log('reading...')
}

ReactDOM.render(
  <StoreContext.Provider value={store}>
    <SelectionContextProvider>
      <App />
    </SelectionContextProvider>
  </StoreContext.Provider>,
  document.getElementById('app')
)
