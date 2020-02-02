import { Store } from 'redux'
import _ from 'lodash'

import * as Types from 'lib/types'
import * as Actions from 'render/redux/actions'
import { getValueControlValue } from 'render/redux/selectors'

type MidiFunctionName =
  | 'note-off'
  | 'note-on'
  | 'poly-aftertouch'
  | 'control'
  | 'program'
  | 'channel-aftertouch'
  | 'pitch-bend'

const midiFunctions: { [byte: number]: MidiFunctionName } = {
    128: 'note-off',
    144: 'note-on',
    160: 'poly-aftertouch',
    176: 'control',
    192: 'program',
    207: 'channel-aftertouch',
    224: 'pitch-bend',
  },
  instantFunctions: MidiFunctionName[] = ['note-on', 'note-off'],
  midiFnMask = 0xf0,
  getFunction = (byte: number) => midiFunctions[byte & midiFnMask],
  midiChannelMask = 0x0f,
  getChannel = (byte: number) => byte & midiChannelMask,
  nav: any = navigator,
  outputs: any[] = [],
  sentValues: number[] = []

export default async function init(store: Store<Types.State>) {
  const handleMessage = ({ data }) => {
      const state = store.getState(),
        [fnbyte, note, value] = data,
        fn = getFunction(fnbyte),
        channel = getChannel(fnbyte)

      for (let index = 0; index < state.bindings.values.length; index++) {
        const binding = state.bindings.values[index]
        if (binding.waiting)
          store.dispatch(
            Actions.setValueBinding({
              index,
              binding: { note, channel },
            })
          )
        else if (binding.note === note && binding.channel === channel) {
          const control = state.controls.values[index]
          if (control)
            store.dispatch(Actions.updateValueControlValue(control, value / 128))
        }
      }

      for (let index = 0; index < state.bindings.cues.length; index++) {
        const binding = state.bindings.cues[index]
        if (binding.waiting && value === 0)
          store.dispatch(
            Actions.setCueBinding({
              index,
              binding: { note, channel },
            })
          )
        else if (
          binding.channel === channel &&
          binding.note === note &&
          fn === 'note-on'
        ) {
          const control = state.controls.cues[index]
          if (control) store.dispatch(Actions.playbackCueControl(control))
        }
      }
    },
    throttledHandle = _.throttle(handleMessage, 100, { leading: false })

  nav.requestMIDIAccess().then(midiAccess => {
    for (var output of midiAccess.outputs.values()) {
      console.log(output.name)
      outputs.push(output)
      output.send([255])
      if (output.name === 'X-TOUCH MINI') {
        for (let i = 1; i <= 8; i++) output.send([176, i, 2])
      }
      // output.send([144, 12, 127])
      // output.send([144, 96, 3])
      //output.send([186, 1, 67])
    }
    for (var input of midiAccess.inputs.values()) {
      input.onmidimessage = mes => {
        const fn = getFunction(mes.data[0])
        if (instantFunctions.includes(fn)) handleMessage(mes)
        else throttledHandle(mes)
      }
    }
  })

  store.subscribe(
    _.throttle(
      () => {
        const state = store.getState()
        /* make values reflect state */
        state.controls.values.forEach((vcontrol, index) => {
          const value = getValueControlValue(state, vcontrol)
          if (value !== sentValues[index]) {
            const binding = state.bindings.values[index]
            sentValues[index] = value
            if (binding && binding.note)
              outputs.forEach(output =>
                output.send([
                  176 + binding.channel,
                  binding.note,
                  Math.floor(value * 127),
                ])
              )
          }
        })
      },
      100,
      { leading: false }
    )
  )
}
