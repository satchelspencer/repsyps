import { Store } from 'redux'
import _ from 'lodash'
import fs from 'fs'
import pathUtils from 'path'

import * as Types from 'render/util/types'
import * as Selectors from './selectors'
import * as Actions from './actions'

export default function initSrcChecker(store: Store<Types.State>) {
  let openedWarning = false,
    lastSources: Types.SourceInfo[] = []
  const checkedPaths: { [path: string]: boolean } = {},
    handleUpdate = () => {
      const state = store.getState(),
        sources = Selectors.getAllSources(state),
        savePath = pathUtils.dirname(state.save.path || '')

      if (lastSources !== sources) {
        lastSources = sources
        sources.forEach((source) => {
          const absPath = pathUtils.resolve(savePath, source.path)
          if (!checkedPaths[absPath]) {
            checkedPaths[absPath] = true
            fs.stat(absPath, (e) => {
              if (e) {
                store.dispatch(
                  Actions.didLoadTrackSource({
                    sourceId: source.sourceId,
                    sourceTrackId: source.sourceTrackId,
                    loaded: false,
                    missing: true,
                  })
                )
                if (!openedWarning) {
                  openedWarning = true
                  store.dispatch(Actions.setModalRoute('relink'))
                  setTimeout(() => (openedWarning = false), 4000)
                }
              }
            })
          }
        })
      }
    },
    throttleHandle = _.throttle(handleUpdate, 500, { leading: false })
  store.subscribe(throttleHandle)
  handleUpdate()
}
