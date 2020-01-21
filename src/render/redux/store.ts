import { createStore } from 'redux'
import { devToolsEnhancer } from 'redux-devtools-extension'

import reducer from './reducer'
import * as Actions from './actions'
import syncAudio from './audio-sync'

const store = createStore(
  reducer,
  {},
  devToolsEnhancer({
    actionCreators: Actions,
    actionsBlacklist: ['UPDATE_TIMES'],
  })
)

syncAudio(store)

export default store
