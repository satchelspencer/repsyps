import { enableBatching } from 'redux-batched-actions'
import reduceReducers from 'reduce-reducers'

import controlsReducer from './reducers/controls'
import cuesReducer from './reducers/cues'
import globalReducer from './reducers/global'
import scenesReducer from './reducers/scenes'
import sourcesReducer from './reducers/sources'
import tracksReducer from './reducers/tracks'

export default enableBatching(
  reduceReducers(
    controlsReducer,
    cuesReducer,
    globalReducer,
    scenesReducer,
    sourcesReducer,
    tracksReducer
  )
)
