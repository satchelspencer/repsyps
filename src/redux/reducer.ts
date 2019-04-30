import { combineReducers } from 'redux'
import { createReducer } from 'deox'

import * as Actions from './actions'
import * as Types from './types'

export default combineReducers({
  tracks: createReducer({} as Types.TracksState, handle => [
    handle(Actions.addTrack, (state, { payload }) => state),
    handle(Actions.rmTrack, (state, { payload }) => state),
    handle(Actions.updateTrackDisplay, (state, { payload }) => state),
    handle(Actions.updateTrackPlayback, (state, { payload }) => state),
  ]),
})
