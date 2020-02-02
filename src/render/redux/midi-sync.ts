import { Store } from 'redux'
import _ from 'lodash'

import * as Types from 'lib/types'
import * as Actions from 'render/redux/actions'

export default async function init(store: Store<Types.State>) {
  const handleMessage = ({ data }) => {
      const state = store.getState(),
        [fn, note, value] = data

      for (let index = 0; index < state.bindings.values.length; index++) {
        const binding = state.bindings.values[index]
        if (binding === -1)
          store.dispatch(
            Actions.setValueBinding({
              index,
              binding: note,
            })
          )
        else if (binding === note) {
          const control = state.controls.values[index]
          if (control)
            store.dispatch(Actions.updateValueControlValue(control, value / 128))
        }
      }

      for (let index = 0; index < state.bindings.cues.length; index++) {
        const binding = state.bindings.cues[index]
        if (binding === -1 && value === 0)
          store.dispatch(
            Actions.setCueBinding({
              index,
              binding: note,
            })
          )
        else if (binding === note && (fn === 153 || fn === 144)) {
          const control = state.controls.cues[index]
          if (control) store.dispatch(Actions.playbackCueControl(control))
        }
      }
    },
    throttledHandle = _.throttle(handleMessage, 100, { leading: false })
  ;(navigator as any).requestMIDIAccess().then(midiAccess => {
    for (var output of midiAccess.outputs.values()) {
      console.log(output)
      output.send([144, 12, 127])
      output.send([144, 96, 3])
      output.send([144, 97, 3])
    }
    for (var input of midiAccess.inputs.values()) {
      input.onmidimessage = mes => {
        const fn = mes.data[0]
        console.log(mes.data)
        if (fn === 153 || fn === 144) handleMessage(mes)
        else throttledHandle(mes)
      }
    }
  })
}
