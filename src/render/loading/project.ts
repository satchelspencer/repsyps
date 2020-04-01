import fs from 'fs'
import { Store } from 'redux'

import * as Types from 'render/util/types'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'

import { apply, version, Migration, Versioned } from './apply-migration'
import * as env from 'render/util/env'

const migration: Migration<any, any> = null

export function loadLocalStorage(store: Store<Types.State>) {
  const raw = localStorage.getItem('repsyps'),
    lraw = localStorage.getItem('repsyps:local')
  try {
    const lstate = JSON.parse(lraw) as Versioned<Types.LocalPersistentState>
    if (lstate.version === env.version)
      store.dispatch(Actions.loadLocalPersisted(lstate.state))
  } catch (e) {}
  try {
    const state = JSON.parse(raw),
      migrated = apply(state, migration) as Versioned<Types.PersistentState>
    if (migrated.version === env.version)
      store.dispatch(Actions.loadPersisted({ state: migrated.state }))
  } catch (e) {}
}

export function saveLocalStorage(store: Store<Types.State>) {
  const state = store.getState(),
    persisted = Selectors.getPersistentState(state),
    lpersisted = Selectors.getLocalPersistentState(state)

  localStorage.setItem('repsyps', JSON.stringify(version(persisted)))
  localStorage.setItem('repsyps:local', JSON.stringify(version(lpersisted)))
}

export function loadProject(path: string, store: Store<Types.State>) {
  const raw = fs.readFileSync(path, 'utf8')
  try {
    const state = JSON.parse(raw),
      migrated = apply(state, migration) as Versioned<Types.PersistentState>
    if (migrated.version === env.version) {
      store.dispatch(Actions.reset({}))
      store.dispatch(Actions.setSaveStatus({ saved: true, path: path }))
      store.dispatch(Actions.loadPersisted({ state: migrated.state }))
    }
  } catch (e) {
    console.log('load err', e)
  }
}

export function saveProject(path: string, store: Store<Types.State>) {
  store.dispatch(Actions.setSaveStatus({ saved: true, path: path }))
  const bindings = Selectors.getPersistentState(store.getState())
  fs.writeFileSync(path, JSON.stringify(version(bindings)))
}
