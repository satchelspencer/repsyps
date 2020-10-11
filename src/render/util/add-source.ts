import { useCallback } from 'react'
import * as _ from 'lodash'
import pathUtils from 'path'
import electron from 'electron'

import { useStore } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import { getId } from 'render/util/uid'

export default function useAddSource() {
  const store = useStore()
  return useCallback((trackId: string) => {
    const paths = electron.remote.dialog.showOpenDialog({
      properties: ['openFile'],
      message: 'Add Source to Audio',
      buttonLabel: 'Add Source',
    })
    if (paths) {
      const id = getId(paths[0]),
        sourceId = store.getState().live.tracks[trackId].sourceId

      store.dispatch(
        Actions.createTrackSource({
          sourceId,
          sourceTrackId: id,
          sourceTrack: {
            name: pathUtils.basename(paths[0], pathUtils.extname(paths[0])),
            source: paths[0],
            loaded: false,
            missing: false,
            streamIndex: 0,
            base: null,
          },
        })
      )
    }
  }, [])
}
