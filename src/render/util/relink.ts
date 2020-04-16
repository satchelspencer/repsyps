import electron from 'electron'
import { Store } from 'redux'
import pathUtils from 'path'
import { batchActions } from 'redux-batched-actions'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import sourceTracks from '../app/info/source-tracks'

const { dialog } = electron.remote

export default function relink(
  sourceId: string,
  sourceTrackId: string,
  store: Store<Types.State>
) {
  const path = dialog.showOpenDialog({
    defaultPath: undefined,
    title: 'replace',
    properties: ['openFile'],
  })
  if (path && path[0]) {
    const state = store.getState(),
      allMissing = Selectors.getMissingSources(state),
      oldPath = state.sources[sourceId].sourceTracks[sourceTrackId].source

    const actions = []
    allMissing.forEach((source) => {
      if (source.sourceId !== sourceId || source.sourceTrackId !== sourceTrackId) {
        const pathGuess = pathUtils.resolve(
          pathUtils.dirname(path[0]),
          pathUtils.relative(pathUtils.dirname(oldPath), pathUtils.dirname(source.path)),
          pathUtils.basename(source.path)
        )
        actions.push(
          Actions.relinkTrackSource({
            sourceId: source.sourceId,
            sourceTrackId: source.sourceTrackId,
            newSource: pathGuess,
          })
        )
      } else {
        actions.push(
          Actions.relinkTrackSource({
            sourceId: source.sourceId,
            sourceTrackId: source.sourceTrackId,
            newSource: path[0],
          })
        )
      }
    })

    store.dispatch(batchActions(actions, 'RELINK_SOURCES'))
  }
}
