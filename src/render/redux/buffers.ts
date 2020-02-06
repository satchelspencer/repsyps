import * as Types from 'render/util/types'

const buffers: { [sourceId: string]: Types.Channels } = {}

export function createBuffer(sourceId: string, channels: Types.Channels) {
  buffers[sourceId] = channels
}

export function getBuffer(sourceId: string){
  return buffers[sourceId]
}

export function delBuffer(sourceId: string){
  delete buffers[sourceId]
}