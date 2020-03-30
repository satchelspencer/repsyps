import fs from 'fs'
import { Store } from 'redux'

import * as Types from 'render/util/types'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'

import { apply, version, Migration, Versioned } from './apply-migration'
import * as env from 'render/util/env'

const migration: Migration<any, any> = null

export function loadLocalStorage(): Types.PersistentState {
  const raw = localStorage.getItem('repsyps')
  try {
    const state = JSON.parse(raw),
      migrated = apply(state, migration) as Versioned<Types.PersistentState>
    if (migrated.version === env.version) return migrated.state
    else return null
  } catch (e) {
    return null
  }
}

export function saveLocalStorage(state: Types.PersistentState) {
  localStorage.setItem('repsyps', JSON.stringify(version(state)))
}

export function loadProject(path: string, store: Store<Types.State>) {}

export function saveProject(path: string, store: Store<Types.State>) {}
