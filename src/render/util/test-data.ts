import _ from 'lodash'
import { Store } from 'redux'

import * as Actions from 'render/redux/actions'
import { createBuffer } from 'render/util/buffers'

export default function(store: Store) {
  const addTrack = id => {
    const f = Math.random() * 100 + 50
    const channels = _.range(2).map(() => {
      const arr = new Float32Array(44100 * 20)
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.sin(i / f) * 0.5
      }
      return arr
    })

    createBuffer(id, channels)

    store.dispatch(
      Actions.createSource({
        sourceId: id,
        source: {
          name: id + 'name',
          bounds: [],
          sourceTracks: { [id]: { name: 'Main', source: 'huh' } },
        },
      })
    )
    store.dispatch(
      Actions.addTrack({
        trackId: id,
        sourceTracksParams: { [id]: { volume: 1 } },
      })
    )
  }

  _.times(3, sceneIndex => {
    store.dispatch(Actions.createScene(sceneIndex))
    _.times(3, i => addTrack('s' + sceneIndex + ':' + i))
  })
  store.dispatch(Actions.setSceneIndex(0))
}
