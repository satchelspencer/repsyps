import _ from 'lodash'
import { Dispatch } from 'redux'

import { createBuffer } from 'render/util/buffers'
import * as Actions from 'render/redux/actions'

const context = new AudioContext()

export default function(file: any, dispatch: Dispatch<any>) {
  const reader = new FileReader()
  reader.onload = async (e: any) => {
    const audioBuff = await context.decodeAudioData(e.target.result),
      id = _.snakeCase(file.name.substr(0, 15)) + new Date().getTime()

    createBuffer(id, [audioBuff.getChannelData(0), audioBuff.getChannelData(1)])
    dispatch(
      Actions.addTrack({
        trackId: id,
        name: file.name,
        trackChannels: { [id]: { name: 'Main', volume: 1 } },
      })
    )
    dispatch(Actions.selectTrackExclusive(id))
  }
  reader.readAsArrayBuffer(file)
}
