import React from 'react'
import ReactDOM from 'react-dom'
import _ from 'lodash'
import { Provider } from 'react-redux'

import store from './redux/store'
import { SelectionContextProvider } from './components/selection'
import initPaths from './loading/app-paths'
import testData from './util/test-data'

import App from './app'

initPaths()
//testData(store)

ReactDOM.render(
  <Provider store={store}>
    <SelectionContextProvider>
      <App />
    </SelectionContextProvider>
  </Provider>,
  document.getElementById('app')
)
