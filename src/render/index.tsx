import React from 'react'
import ReactDOM from 'react-dom'
import _ from 'lodash'
import { Provider } from 'react-redux'

import store from './redux/store'
import { SelectionContextProvider } from './components/selection'
import { TimingContextProvider } from './components/timing'
import initPaths from './loading/app-paths'

import App from './app'

initPaths()

ReactDOM.render(
  <Provider store={store}>
    <SelectionContextProvider>
      <TimingContextProvider>
        <App />
      </TimingContextProvider>
    </SelectionContextProvider>
  </Provider>,
  document.getElementById('app')
)
