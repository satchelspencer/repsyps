import { createStore } from 'redux'
import { devToolsEnhancer } from 'redux-devtools-extension'

import reducer from './reducer'
import * as Actions from './actions'

export default createStore(reducer, {}, devToolsEnhancer({ actionCreators: Actions }))
