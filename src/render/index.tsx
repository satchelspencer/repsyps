import React from 'react'
import ReactDOM from 'react-dom'
import _ from 'lodash'
import { StoreContext } from 'redux-react-hook'

import store from './redux/store'
import { SelectionContextProvider } from './components/selection'
import testData from './util/test-data'

import App from './app'

ReactDOM.render(
  <StoreContext.Provider value={store}>
    <SelectionContextProvider>
      <App />
    </SelectionContextProvider>
  </StoreContext.Provider>,
  document.getElementById('app')
)

//testData(store)