import fs from 'fs'
import { Store } from 'redux'

import * as Types from 'render/util/types'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import * as PastTypes from './past-types'

import { apply, version, Migration, Versioned } from './apply-migration'
import { globalControlsIndex2Ids } from './project'

const bindingsTrackIndicies2Ids: Migration<
  PastTypes.BindingsFileV3,
  Types.BindingsFile
> = {
  fromVersion: '0.0.0',
  toVersion: '4',
  apply: (state) => {
    return {
      ...state,
      globalControls: globalControlsIndex2Ids(state.globalControls),
    }
  },
}

const migration = bindingsTrackIndicies2Ids
export const latest = '4'

export function loadBindings(path: string, store: Store<Types.State>) {
  const raw = fs.readFileSync(path, 'utf8')
  try {
    const state = JSON.parse(raw),
      migrated = apply(state, migration) as Versioned<Types.BindingsFile>
    if (migrated.version === latest) {
      store.dispatch(Actions.loadBindings(migrated.state))
    }
  } catch (e) {
    console.log('load err', e)
  }
}

export function saveBindings(path: string, store: Store<Types.State>) {
  const bindings = Selectors.getBindings(store.getState())
  fs.writeFileSync(path, JSON.stringify(version(bindings, latest)))
}
