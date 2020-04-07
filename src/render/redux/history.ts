import { Store } from 'redux'
import { diff, patch, unpatch, Delta, create } from 'jsondiffpatch'
import clone from 'clone'
import _ from 'lodash'

import * as Types from 'render/util/types'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'

let lastPersistent: Types.PersistentState = null,
  lastPatched: Types.PersistentState = null,
  history: any[] = [],
  index = 0,
  store: Store<Types.State> = null,
  inSync = true

export function undo() {
  if (index > 0 && inSync) {
    //console.log('undoing', history[index - 1])
    const newState = unpatch(clone(lastPatched, false), history[index - 1])
    lastPatched = newState
    index--
    store.dispatch(Actions.loadPersisted({ state: newState }))
  }
}

export function redo() {
  if (index < history.length && inSync) {
    //console.log('redoing', history[index - 1])
    const newState = patch(clone(lastPatched, false), history[index])
    lastPatched = newState
    index++
    store.dispatch(Actions.loadPersisted({ state: newState }))
  }
}

export default function initHistory(s: Store<Types.State>) {
  store = s
  const handleDiff = _.debounce((persistent: Types.PersistentState) => {
      const difference = diff(lastPatched, persistent)
      if (difference && lastPatched) {
        history = [..._.take(history, index), difference]
        index++
      }
      inSync = true
      lastPatched = persistent
    }, 500),
    handleUpdate = () => {
      const state = store.getState(),
        persistent = Selectors.getPersistentState(state)
      if (persistent !== lastPersistent) {
        inSync = false
        handleDiff(persistent)
        lastPersistent = persistent
      }
    }

  store.subscribe(handleUpdate)
  handleUpdate()
}
