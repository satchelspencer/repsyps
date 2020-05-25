const callbacks: { [key: string]: (val: any) => any } = {}

export interface TrackEvents {
  jog: number
  click: boolean
}

export function sub<K extends keyof TrackEvents>(
  trackId: string,
  event: K,
  callback: (res: TrackEvents[K]) => any
) {
  callbacks[trackId + '_' + event] = callback
}

export function unsub<K extends keyof TrackEvents>(trackId: string, event: K) {
  delete callbacks[trackId + '_' + event]
}

export function call<K extends keyof TrackEvents>(
  trackId: string,
  event: K,
  value: TrackEvents[K]
) {
  const key = trackId + '_' + event
  if (callbacks[key]) callbacks[key](value)
}
