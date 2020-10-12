import { enableBatching } from 'redux-batched-actions'
import { Reducer } from 'redux'
import reduceReducers from 'reduce-reducers'

import controlsReducer from './reducers/controls'
import cuesReducer from './reducers/cues'
import globalReducer from './reducers/global'
import scenesReducer from './reducers/scenes'
import sourcesReducer from './reducers/sources'
import tracksReducer from './reducers/tracks'

export default enableBatching(
  reduceReducers(
    controlsReducer as any,
    cuesReducer as any,
    globalReducer as any,
    scenesReducer as any,
    sourcesReducer as any,
    tracksReducer as any
  )
)
