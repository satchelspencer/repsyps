import { Store } from 'redux'
import _ from 'lodash'

import * as Types from 'render/util/types'
import mappings from 'render/util/mappings'

import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'

const midiFunctions: { [byte: number]: Types.MidiFunctionName } = {
    128: 'note-off',
    144: 'note-on',
    160: 'poly-aftertouch',
    176: 'control',
    192: 'program',
    207: 'channel-aftertouch',
    224: 'pitch-bend',
  },
  instantFunctions: Types.MidiFunctionName[] = ['note-on', 'note-off'],
  midiFnMask = 0xf0,
  getFunction = (byte: number) => midiFunctions[byte & midiFnMask],
  midiChannelMask = 0x0f,
  getChannel = (byte: number) => byte & midiChannelMask,
  nav: any = navigator, //any so as to allow web midi api
  outputs: any[] = [], //web midi output (no type defs)
  sentMidiValues: { [controlId: string]: number } = {}

export default async function init(store: Store<Types.State>) {
  const handleMessage = ({ data }) => {
      const state = store.getState(),
        controls = Selectors.getControls(state.scenes),
        [fnbyte, note, value] = data,
        fn = getFunction(fnbyte),
        channel = getChannel(fnbyte)

      for (let bindingId in state.bindings) {
        const binding = state.bindings[bindingId]
        if (binding.waiting) {
          store.dispatch(
            Actions.addBinding({
              bindingId: bindingId,
              binding: {
                ...binding,
                note,
                channel,
                function: fn,
                waiting: false,
              },
            })
          )
          break
        } else if (
          binding.note === note &&
          binding.channel === channel &&
          binding.function === fn
        ) {
          const control = Selectors.getControlByPosition(controls, binding.position)
          if (control) {
            let normedValue = value / 128
            if ('prop' in control)
              normedValue = mappings[control.prop].fromStandard(normedValue)
            store.dispatch(
              Actions.applyControl({
                control,
                value: normedValue,
                function: fn,
              })
            )
          }
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
        const state = store.getState(),
          controls = Selectors.getControls(state.scenes)
        /* make values reflect state */
        for (let controlId in controls) {
          const control = controls[controlId]
          if (control.type === 'value') {
            const value = Selectors.getValueControlValue(state, control)
            if (value !== sentMidiValues[controlId]) {
              const binding = Selectors.getBindingByPosition(
                state.bindings,
                control.position
              )
              sentMidiValues[controlId] = value
              if (binding && binding.note)
                outputs.forEach(output =>
                  output.send([
                    176 + binding.channel,
                    binding.note,
                    Math.floor(value * 127),
                  ])
                )
            }
          }
        }
      },
      100,
      { leading: false }
    )
  )
}
