import electron from 'electron'
import { Store } from 'redux'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'

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
  if (path && path[0])
    store.dispatch(
      Actions.relinkTrackSource({
        sourceId,
        sourceTrackId,
        newSource: path[0],
      })
    )
}
