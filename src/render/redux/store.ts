import { createStore } from 'redux'
import { devToolsEnhancer } from 'redux-devtools-extension'

import reducer, { defaultState } from './reducer'
import * as Actions from './actions'
import syncAudio from './audio-sync'
import syncMidi from './midi-sync'
import initMenu from './menu'
import initPersist from './persist'

const store = createStore(
  reducer,
  defaultState,
  devToolsEnhancer({
    actionCreators: Actions,
    actionsBlacklist: ['UPDATE_TIMES'],
  })
)

syncAudio(store)
syncMidi(store)
initMenu(store)
initPersist(store)

export default store
