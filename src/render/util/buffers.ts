import * as Types from 'render/util/types'

const buffers: { [trackId: string]: Types.Channels } = {}

export function createBuffer(trackId: string, channels: Types.Channels) {
  buffers[trackId] = channels
}

export function getBuffer(trackId: string){
  return buffers[trackId]
}

export function delBuffer(trackId: string){
  delete buffers[trackId]
}