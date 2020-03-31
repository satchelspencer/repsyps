import { Store } from 'redux'
import _ from 'lodash'
import { diff } from 'jsondiffpatch'

import * as Types from 'render/util/types'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'

import { loadLocalStorage, saveLocalStorage } from 'render/loading/project'

export default function syncAudio(store: Store<Types.State>) {
  let lastPersistent: Types.PersistentState = null

  const throttleSave = _.throttle(() => saveLocalStorage(store), 1000, { leading: false })

  const handleUpdate = () => {
    const persistent = Selectors.getPersistentState(store.getState())
    if (persistent !== lastPersistent) {
      //console.log(diff(lastPersistent, persistent))
      lastPersistent = persistent
      throttleSave()
    }
  }

  loadLocalStorage(store)

  store.subscribe(handleUpdate)
  handleUpdate()
}
