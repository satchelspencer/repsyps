import pathUtils from 'path'
import fs from 'fs'
import _ from 'lodash'
import walk from 'walk'
import { Store } from 'redux'

import * as Types from 'render/util/types'
import { getPath } from 'render/loading/app-paths'
import { getProjectFromRaw } from './project'
import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'

export function getLibraryProject(state: Types.PersistentState): Types.LibraryProject {
  return {
    scenes: state.live.scenes.map((scene) => {
      return {
        trackIds: scene.trackIds,
      }
    }),
    tracks: _.mapValues(
      state.live.tracks,
      (track, trackId): Types.LibraryTrack => {
        const source = state.sources[trackId]
        return {
          name: source.name,
          avgPeriod: Selectors.getAvgPeriod(source.bounds) * source.boundsAlpha,
          length:
            source.bounds.length > 1
              ? source.bounds[source.bounds.length - 1] - source.bounds[0]
              : null,
        }
      }
    ),
  }
}

export function scan(path: string) {
  return new Promise<Types.LibraryProjects>((res) => {
    const walker = walk.walk(path, { followLinks: false }),
      newProjects: Types.LibraryProjects = {}
    walker.on('file', async (root, stat, next) => {
      if (pathUtils.extname(stat.name) === '.syp') {
        const path = pathUtils.join(root, stat.name)

        const raw = await fs.promises.readFile(path, 'utf-8'),
          state = getProjectFromRaw(raw),
          libState = state && getLibraryProject(state)

        if (libState) newProjects[path] = libState
      }
      next()
    })
    walker.on('errors', (r, s, next) => next())
    walker.on('end', () => {
      res(newProjects)
    })
  })
}

export async function initLibrary(store: Store<Types.State>) {
  store.dispatch(Actions.setLibraryState({ scanning: true }))
  const projects = await scan(getPath('library'))
  store.dispatch(Actions.setLibraryState({ scanning: false, projects }))
}
