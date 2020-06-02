import fs from 'fs'
import { Store } from 'redux'
import pathUtils from 'path'
import _ from 'lodash'

import * as Types from 'render/util/types'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'

import { apply, version, Migration, Versioned } from './apply-migration'

const migration: Migration<any, any> = null,
  latest = '0.0.0'

export function loadLocalStorage(store: Store<Types.State>) {
  const raw = localStorage.getItem('repsyps'),
    lraw = localStorage.getItem('repsyps:local')
  try {
    const lstate = JSON.parse(lraw) as Versioned<Types.LocalPersistentState>
    if (lstate.version === latest)
      store.dispatch(Actions.loadLocalPersisted(lstate.state))
  } catch (e) {}
  try {
    const state = JSON.parse(raw),
      migrated = apply(state, migration) as Versioned<Types.PersistentState>
    if (migrated.version === latest)
      store.dispatch(Actions.loadPersisted({ state: migrated.state, reset: true }))
  } catch (e) {}
}

export function saveLocalStorage(store: Store<Types.State>) {
  const state = store.getState(),
    persisted = Selectors.getPersistentState(state),
    lpersisted = Selectors.getLocalPersistentState(state)

  localStorage.setItem('repsyps', JSON.stringify(version(persisted, latest)))
  localStorage.setItem('repsyps:local', JSON.stringify(version(lpersisted, latest)))
}

export function getProjectFromRaw(raw: string) {
  try {
    const state = JSON.parse(raw),
      migrated = apply(state, migration) as Versioned<Types.PersistentState>
    if (migrated.version === latest) {
      return migrated.state
    } else return null
  } catch (e) {
    return null
  }
}

function getPropjectFromFile(path: string) {
  const raw = fs.readFileSync(path, 'utf8')
  return getProjectFromRaw(raw)
}

export function loadProject(path: string, store: Store<Types.State>) {
  const state = getPropjectFromFile(path)
  if (state) {
    store.dispatch(Actions.reset())
    store.dispatch(Actions.setSaveStatus({ saved: true, path: path }))
    store.dispatch(Actions.loadPersisted({ state, reset: true }))
  }
}

export function loadProjectScenes(
  path: string,
  insertIndex: number,
  store: Store<Types.State>,
  tracksOnly?: boolean
) {
  const state = getPropjectFromFile(path)
  if (state) {
    store.dispatch(
      Actions.loadScenes({
        state,
        insertIndex,
        fromPath: pathUtils.dirname(path),
        tracksOnly: !!tracksOnly,
      })
    )
  }
}

export function exportCurrentScene(path: string, store: Store<Types.State>) {
  const state = store.getState(),
    sceneState = Selectors.getSceneExport(state, state.live.sceneIndex, path)
  fs.writeFileSync(path, JSON.stringify(version(sceneState, latest)))
}

export function saveProject(path: string, store: Store<Types.State>) {
  store.dispatch(Actions.setSaveStatus({ saved: true, path: path }))
  const bindings = Selectors.getPersistentState(store.getState())
  fs.writeFileSync(path, JSON.stringify(version(bindings, latest)))
}

export function exportProject(path: string, store: Store<Types.State>) {
  const state = store.getState(),
    baseName = pathUtils.basename(path),
    sources = state.sources,
    currentPath = state.save.path || ''

  fs.mkdirSync(path)
  _.keys(sources).forEach((sourceId) => {
    const source = sources[sourceId]
    _.keys(source.sourceTracks).forEach((sourceTrackId) => {
      const sourceTrack = source.sourceTracks[sourceTrackId],
        newPath = pathUtils.basename(sourceTrack.source),
        absSource = pathUtils.resolve(pathUtils.dirname(currentPath), sourceTrack.source),
        absDest = pathUtils.join(path, newPath)

      fs.copyFileSync(absSource, absDest)
      store.dispatch(
        Actions.moveSourceTrack({
          sourceId,
          sourceTrackId,
          source: absDest,
        })
      )
    })
  })
  const projectPath = pathUtils.join(path, baseName + '.syp')
  saveProject(projectPath, store)
}
