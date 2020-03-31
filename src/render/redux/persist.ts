import { Store } from 'redux'
import _ from 'lodash'

import * as Types from 'render/util/types'
import * as Selectors from 'render/redux/selectors'

import { loadLocalStorage, saveLocalStorage } from 'render/loading/project'

export default function syncAudio(store: Store<Types.State>) {
  let lastPersistent: Types.PersistentState = null,
    lastLocalPersistent: Types.LocalPersistentState = null

  const throttleSave = _.throttle(() => saveLocalStorage(store), 1000, { leading: false })

  const handleUpdate = () => {
    const state = store.getState(),
      persistent = Selectors.getPersistentState(state),
      lpersistent = Selectors.getLocalPersistentState(state)
    if (persistent !== lastPersistent || lpersistent !== lastLocalPersistent) {
      lastPersistent = persistent
      lastLocalPersistent = lpersistent
      throttleSave()
    }
  }

  loadLocalStorage(store)

  store.subscribe(handleUpdate)
  handleUpdate()
}
