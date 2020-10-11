import fs from 'fs'
import { Store } from 'redux'
import pathUtils from 'path'
import _ from 'lodash'

import * as Types from 'render/util/types'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'

import { appendToLibrary } from './library'
import { apply, version, Migration, Versioned } from './apply-migration'
import * as PastTypes from './past-types'

const addExplicitSourceId: Migration<
  PastTypes.PersistentStateV0,
  Types.PersistentState
> = {
  fromVersion: '0.0.0',
  toVersion: '0.0.1',
  apply: (state) => {
    return {
      ...state,
      live: {
        ...state.live,
        tracks: _.mapValues(state.live.tracks, (track, trackId) => {
          return {
            ...track,
            sourceId: trackId,
          }
        }),
      },
    }
  },
}

const persistentStateMigration = addExplicitSourceId,
  latestPersistentState = '0.0.1'

const localPersistentStateMigration: Migration<any, any> = null,
  latestLocalPersistentState = '0.0.0'

export function loadLocalStorage(store: Store<Types.State>) {
  const raw = localStorage.getItem('repsyps'),
    lraw = localStorage.getItem('repsyps:local')
  try {
    const lstate = JSON.parse(lraw),
      migrated = apply(lstate, localPersistentStateMigration) as Versioned<
        Types.LocalPersistentState
      >
    if (lstate.version === latestLocalPersistentState)
      store.dispatch(Actions.loadLocalPersisted(migrated.state))
  } catch (e) {}
  try {
    const state = JSON.parse(raw),
      migrated = apply(state, persistentStateMigration) as Versioned<
        Types.PersistentState
      >
    if (migrated.version === latestPersistentState)
      store.dispatch(Actions.loadPersisted({ state: migrated.state, reset: true }))
  } catch (e) {}
}

export function saveLocalStorage(store: Store<Types.State>) {
  const state = store.getState(),
    persisted = Selectors.getPersistentState(state),
    lpersisted = Selectors.getLocalPersistentState(state)

  localStorage.setItem(
    'repsyps',
    JSON.stringify(version(persisted, latestPersistentState))
  )
  localStorage.setItem(
    'repsyps:local',
    JSON.stringify(version(lpersisted, latestLocalPersistentState))
  )
}

export function getProjectFromRaw(raw: string) {
  try {
    const state = JSON.parse(raw),
      migrated = apply(state, persistentStateMigration) as Versioned<
        Types.PersistentState
      >
    if (migrated.version === latestPersistentState) {
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
  store: Store<Types.State>,
  tracksOnly: boolean,
  insertIndex?: number
) {
  const state = getPropjectFromFile(path)
  if (state) {
    store.dispatch(
      Actions.loadScenes({
        state,
        insertIndex,
        fromPath: pathUtils.dirname(path),
        tracksOnly,
      })
    )
  }
}

export function loadProjectTrack(
  path: string,
  store: Store<Types.State>,
  trackId: string,
  tracksOnly: boolean,
  insertIndex?: number
) {
  const state = getPropjectFromFile(path),
    wrapperScene = state.live.scenes.find((scene) => scene.trackIds.includes(trackId)),
    singleTrackState: Types.PersistentState = {
      ...state,
      live: {
        ...state.live,
        tracks: _.pick(state.live.tracks, trackId),
        scenes: [
          {
            ...wrapperScene,
            trackIds: [trackId],
          },
        ],
      },
      sources: _.pick(state.sources, trackId),
    }
  if (state) {
    store.dispatch(
      Actions.loadScenes({
        state: singleTrackState,
        insertIndex,
        fromPath: pathUtils.dirname(path),
        tracksOnly,
      })
    )
  }
}

export function loadProjectScene(
  path: string,
  store: Store<Types.State>,
  sceneIndex: number,
  tracksOnly: boolean,
  insertIndex?: number
) {
  const state = getPropjectFromFile(path),
    scene: Types.PersistentScene = state.live.scenes[sceneIndex],
    singleTrackState: Types.PersistentState = {
      ...state,
      live: {
        ...state.live,
        tracks: _.pickBy(state.live.tracks, (_, trackId) =>
          scene.trackIds.includes(trackId)
        ),
        scenes: state.live.scenes.slice(sceneIndex, sceneIndex + 1),
      },
      sources: _.pick(state.sources, scene.trackIds),
    }
  if (state) {
    store.dispatch(
      Actions.loadScenes({
        state: singleTrackState,
        insertIndex,
        fromPath: pathUtils.dirname(path),
        tracksOnly: tracksOnly,
      })
    )
  }
}

export function exportCurrentScene(path: string, store: Store<Types.State>) {
  const state = store.getState(),
    sceneState = Selectors.getSceneExport(state, state.live.sceneIndex, path)
  fs.writeFileSync(path, JSON.stringify(version(sceneState, latestPersistentState)))
  appendToLibrary(store, path)
}

export function saveProject(path: string, store: Store<Types.State>) {
  store.dispatch(Actions.setSaveStatus({ saved: true, path: path }))
  const bindings = Selectors.getPersistentState(store.getState())
  fs.writeFileSync(path, JSON.stringify(version(bindings, latestPersistentState)))
  appendToLibrary(store, path)
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
  appendToLibrary(store, path)
}
