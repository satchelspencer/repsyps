import _ from 'lodash'
import * as env from 'render/util/env'

export type Versioned<State> = {
  state: State
  version: string
}

export interface Migration<Old, New> {
  fromVersion: string
  toVersion: string
  apply: (state: Old) => New
  next?: Migration<New, any>
}

export function apply<Old, Final>(
  state: Versioned<Old>,
  migration: Migration<Old, any>
): Versioned<Final> {
  let currentMig = migration,
    currentState: Versioned<any> = state
  while (currentMig) {
    if (currentState.version === currentMig.fromVersion) {
      currentState.state = currentMig.apply(currentState.state)
      currentState.version = currentMig.toVersion
    }
    currentMig = currentMig.next
  }
  return currentState
}

export function version<S>(state: S, version?: string): Versioned<S> {
  return {
    state,
    version: version || env.version,
  }
}
