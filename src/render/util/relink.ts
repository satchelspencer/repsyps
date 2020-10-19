import electron from 'electron'
import { Store, AnyAction } from 'redux'
import * as _ from 'lodash'
import pathUtils from 'path'
import { batchActions } from 'redux-batched-actions'
import fs from 'fs'

import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import * as Types from 'render/util/types'

export default async function relink(
  missingSource: Types.SourceInfo,
  store: Store<Types.State>
) {
  const state = store.getState(),
    missing = Selectors.getMissingSources(state),
    pathRes = await electron.remote.dialog.showOpenDialog({
      defaultPath: undefined,
      title: 'replace',
      properties: ['openFile'],
      message: `Find ${pathUtils.basename(missingSource.path)}`,
      buttonLabel: 'Relink File',
    }),
    newPath = _.first(pathRes.filePaths)
  if (newPath) {
    const oldPath = missingSource.path,
      actions: AnyAction[] = []

    missing.forEach((source) => {
      if (
        source.sourceId !== missingSource.sourceId ||
        source.sourceTrackId !== missingSource.sourceTrackId
      ) {
        const pathGuess = pathUtils.resolve(
          pathUtils.dirname(newPath),
          pathUtils.relative(pathUtils.dirname(oldPath), pathUtils.dirname(source.path)),
          pathUtils.basename(source.path)
        )
        try {
          /* only if the path exists give it a shot */
          fs.statSync(pathGuess)
          actions.push(
            Actions.relinkTrackSource({
              sourceId: source.sourceId,
              sourceTrackId: source.sourceTrackId,
              newSource: pathGuess,
            })
          )
        } catch (e) {}
      } else {
        actions.push(
          Actions.relinkTrackSource({
            sourceId: source.sourceId,
            sourceTrackId: source.sourceTrackId,
            newSource: newPath,
          })
        )
      }
    })

    store.dispatch(batchActions(actions, 'RELINK_SOURCES'))
  }
}
