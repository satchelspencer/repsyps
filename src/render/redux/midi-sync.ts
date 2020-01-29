import { Store } from 'redux'
import _ from 'lodash'

import * as Types from 'lib/types'
import * as Actions from 'render/redux/actions'

export default async function init(store: Store<Types.State>) {
  const handleMessage = _.throttle(({ data }) => {
    const state = store.getState(),
      [fn, note, value] = data

    for (let controlId in state.controls) {
      const control = state.controls[controlId]
      if (!control.midiId) {
        store.dispatch(
          Actions.setControlMidiId({
            controlId,
            midiId: note,
          })
        )
        break
      }
      if (control.midiId === note) {
        //handle
        if ('prop' in control) {
          if (control.prop === 'volume')
            store.dispatch(
              Actions.setSourcePlayback({
                sourceId: control.sourceId,
                playback: { volume: value / 128 },
              })
            )
        }
        break
      }
    }
  }, 100)

  ;(navigator as any).requestMIDIAccess().then(midiAccess => {
    for (var input of midiAccess.inputs.values()) {
      input.onmidimessage = handleMessage
    }
  })
}
