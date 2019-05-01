import { createStore } from 'redux'
import { devToolsEnhancer } from 'redux-devtools-extension'

import reducer from './reducer'
import * as Actions from './actions'
import initAudio from '../audio/controller'

const store = createStore(reducer, {}, devToolsEnhancer({ actionCreators: Actions }))

initAudio(store)

export default store