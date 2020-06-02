import { createStore } from 'redux'
import { devToolsEnhancer } from 'redux-devtools-extension'

import reducer from './reducer'
import { defaultState } from './defaults'
import * as Actions from './actions'
import syncAudio from './audio-sync'
import syncMidi from './midi-sync'
import initPersist from './persist'
import initHistory from './history'
import initFileAssoc from './file-assoc'
import initSrcChecker from './src-checker'
import { initLibrary } from '../loading/library'

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
initPersist(store)
initHistory(store)
initFileAssoc(store)
initSrcChecker(store)
initLibrary(store)

export default store
