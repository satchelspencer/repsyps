import _ from 'lodash'
import { Dispatch } from 'redux'
import fs from 'fs'
import * as pathUtils from 'path'

import { createBuffer } from 'render/util/buffers'
import * as Actions from 'render/redux/actions'

export const context = new AudioContext()

export async function addBufferFromAudio(id: string, rawData: ArrayBuffer) {
  const audioBuff = await context.decodeAudioData(rawData)
  createBuffer(id, [audioBuff.getChannelData(0), audioBuff.getChannelData(1)])
}

function getId(path: string): string {
  return _.snakeCase(pathUtils.basename(path).substr(0, 15)) + new Date().getTime()
}

export function getBufferFromPath(path: string, id: string, cb: () => void) {
  fs.readFile(path, async (e, data) => {
    if (!e) {
      const audioBuff = await context.decodeAudioData(data.buffer)
      createBuffer(id, [audioBuff.getChannelData(0), audioBuff.getChannelData(1)])
      cb()
    }
  })
}

export async function addSource(trackId: string, path: string, dispatch: Dispatch<any>) {
  const id = getId(path) //await getBufferFromFile(file)
  dispatch(
    Actions.createTrackSource({
      sourceId: trackId,
      sourceTrackId: id,
      sourceTrack: { name: pathUtils.basename(path), source: path, loaded: false },
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

export default async function(path: string, dispatch: Dispatch<any>) {
  const id = getId(path),
    name = pathUtils.basename(path)
  dispatch(
    Actions.createSource({
      sourceId: id,
      source: {
        name,
        bounds: [],
        sourceTracks: { [id]: { name, source: path, loaded: false } },
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
