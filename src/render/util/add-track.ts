import _ from 'lodash'
import { Dispatch } from 'redux'

import { createBuffer } from 'render/util/buffers'
import * as Actions from 'render/redux/actions'

export const context = new AudioContext()

export async function addBufferFromAudio(id: string, rawData: ArrayBuffer) {
  const audioBuff = await context.decodeAudioData(rawData)
  createBuffer(id, [audioBuff.getChannelData(0), audioBuff.getChannelData(1)])
}

export default function(file: any, dispatch: Dispatch<any>) {
  const reader = new FileReader()
  reader.onload = async (e: any) => {
    const id = _.snakeCase(file.name.substr(0, 15)) + new Date().getTime()
    await addBufferFromAudio(id, e.target.result)
    dispatch(
      Actions.createSource({
        sourceId: id,
        source: {
          name: file.name,
          bounds: [],
          trackSources: { [id]: { name: 'Main', source: file.path } },
        },
      })
    )
    dispatch(
      Actions.addTrack({
        trackId: id,
        trackSourcesParams: { [id]: { volume: 1 } },
      })
    )
    dispatch(Actions.selectTrackExclusive(id))
  }
  reader.readAsArrayBuffer(file)
}
