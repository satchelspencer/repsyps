import { createStore } from 'redux'
import { devToolsEnhancer } from 'redux-devtools-extension'

import reducer from './reducer'
import * as Actions from './actions'

const store = createStore(
  reducer,
  {},
  devToolsEnhancer({
    actionCreators: Actions,
    actionsBlacklist: [],
  })
)

export default store
