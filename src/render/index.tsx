import React from 'react'
import ReactDOM from 'react-dom'
import _ from 'lodash'
import { Provider } from 'react-redux'
import electron from 'electron'

import store from './redux/store'
import { SelectionContextProvider } from './components/selection'
import initPaths from './loading/app-paths'

import App from './app'

initPaths()

const { app } = electron.remote

app.requestSingleInstanceLock()
app.on('second-instance', (event, argv, cwd) => {
  console.log(event, argv, cwd)
})
app.on('open-file', (event, path) => {
  console.log(event, path)
})

ReactDOM.render(
  <Provider store={store}>
    <SelectionContextProvider>
      <App />
    </SelectionContextProvider>
  </Provider>,
  document.getElementById('app')
)
