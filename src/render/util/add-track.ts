import _ from 'lodash'
import { Dispatch } from 'redux'

import { createBuffer } from 'render/util/buffers'
import * as Actions from 'render/redux/actions'

export const context = new AudioContext()

export async function addBufferFromAudio(id: string, rawData: ArrayBuffer) {
  const audioBuff = await context.decodeAudioData(rawData)
  createBuffer(id, [audioBuff.getChannelData(0), audioBuff.getChannelData(1)])
}

function getBufferFromFile(file: any) {
  return new Promise<string>((res, rej) => {
    const reader = new FileReader()
    reader.onload = async (e: any) => {
      const id = _.snakeCase(file.name.substr(0, 15)) + new Date().getTime()
      await addBufferFromAudio(id, e.target.result)
      res(id)
    }
    reader.readAsArrayBuffer(file)
  })
}

export async function addSource(trackId: string, file: any, dispatch: Dispatch<any>) {
  const id = await getBufferFromFile(file)
  dispatch(
    Actions.createTrackSource({
      sourceId: trackId,
      sourceTrackId: id,
      sourceTrack: { name: file.name, source: file.path },
    })
  )
  dispatch(
    Actions.setTrackSourceParams({
      trackId: trackId,
      sourceTrackId: id,
      sourceTrackParams: {
        volume: 0,
        offset: 0,
      },
    })
  )
}

export default async function(file: any, dispatch: Dispatch<any>) {
  const id = await getBufferFromFile(file)
  dispatch(
    Actions.createSource({
      sourceId: id,
      source: {
        name: file.name,
        bounds: [],
        sourceTracks: { [id]: { name: file.name, source: file.path } },
      },
    })
  )
  dispatch(
    Actions.addTrack({
      trackId: id,
      sourceTracksParams: { [id]: { volume: 1, offset: 0 } },
    })
  )
  dispatch(Actions.selectTrackExclusive(id))
}
