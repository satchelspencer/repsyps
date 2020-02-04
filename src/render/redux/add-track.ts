import _ from 'lodash'

import { createBuffer } from 'render/redux/buffers'
import * as Actions from 'render/redux/actions'

const context = new AudioContext()

export default function(file: any, dispatch: any) {
  const reader = new FileReader()
  reader.onload = async (e: any) => {
    const audioBuff = await context.decodeAudioData(e.target.result),
      id = _.snakeCase(file.name.substr(0, 15)) + new Date().getTime()

    createBuffer(id, [audioBuff.getChannelData(0), audioBuff.getChannelData(1)])
    dispatch(
      Actions.addSource({
        sourceId: id,
        name: file.name,
        trackSources: { [id]: { name: 'Main', volume: 0.666 } },
      })
    )
    dispatch(Actions.selectSourceExclusive(id))
  }
  reader.readAsArrayBuffer(file)
}
