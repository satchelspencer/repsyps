import { Store } from 'redux'
import _ from 'lodash'
import { batchActions } from 'redux-batched-actions'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'

const midiFunctions: { [byte: number]: Types.MidiFunctionName } = {
    128: 'note',
    144: 'note',
    160: 'poly-aftertouch',
    176: 'control',
    192: 'program',
    207: 'channel-aftertouch',
    224: 'pitch-bend',
  },
  instantFunctions: Types.MidiFunctionName[] = ['note'],
  midiFnMask = 0xf0,
  getFunction = (byte: number) => midiFunctions[byte & midiFnMask],
  midiChannelMask = 0x0f,
  getChannel = (byte: number) => byte & midiChannelMask,
  nav: any = navigator, //any so as to allow web midi api
  outputs: { [portId: string]: any } = {}, //web midi output (no type defs)
  //sentMidiValues: { [controlId: string]: number } = {}
  sentMidiValues: { [portName: string]: { [controlId: string]: number } } = {}

export default async function init(store: Store<Types.State>) {
  const handleMessage = ({ data }, portName) => {
      const state = store.getState(),
        controls = Selectors.getControls(state.live),
        [fnbyte, note, value] = data,
        fn = getFunction(fnbyte),
        channel = getChannel(fnbyte),
        normValue = instantFunctions.includes(fn) ? 1 - value / 127 : value / 127

      if (!state.live.controlsEnabled) return

      for (let posStr in state.live.bindings) {
        const binding = state.live.bindings[posStr],
          position = Selectors.str2pos(posStr)

        if (binding.waiting) {
          store.dispatch(
            batchActions([
              Actions.setBinding({
                position,
                binding: {
                  ...binding,
                  type: instantFunctions.includes(fn) ? 'note' : 'value',
                  note,
                  channel,
                  function: fn,
                  waiting: false,
                },
              }),
              Actions.setInitValue({
                position,
                value: 1,
              }),
              Actions.setControlGroupValue({
                position,
                value: normValue,
              }),
            ])
          )
          break
        } else if (
          binding.note === note &&
          binding.channel === channel &&
          binding.function === fn
        ) {
          const control = controls[posStr],
            lastValue = state.live.controlValues[posStr] || 0
          sentMidiValues[portName][posStr] = normValue
          if (control) {
            store.dispatch(
              Actions.applyControlGroup(position, control, lastValue, normValue)
            )
          }
        }
      }
    },
    throttledHandle = _.throttle(handleMessage, 100, { leading: false }),
    addInput = port => {
      console.log('connect', port.name)
      port.onmidimessage = mes => {
        const fn = getFunction(mes.data[0])
        if (instantFunctions.includes(fn)) handleMessage(mes, port.name)
        else throttledHandle(mes, port.name)
      }
    },
    removeInput = port => {
      console.log('disconnect', port.name)
    },
    addOutput = port => {
      sentMidiValues[port.name] = sentMidiValues[port.name] || {}
      outputs[port.name] = port
      port.send([255])
      handleStoreUpdate()
    },
    removeOutput = port => {
      delete outputs[port.name]
      delete sentMidiValues[port.name]
    }

  nav.requestMIDIAccess().then(midiAccess => {
    midiAccess.onstatechange = e => {
      if (e.port.type === 'input') {
        if (e.port.state === 'connected' && e.port.connection === 'open') addInput(e.port)
        else if (e.port.state === 'disconnected') removeInput(e.port)
      } else if (e.port.type === 'output') {
        if (e.port.state === 'connected' && e.port.connection === 'open')
          addOutput(e.port)
        else if (e.port.state === 'disconnected') removeOutput(e.port)
      }
    }
    for (let output of midiAccess.outputs.values()) addOutput(output)
    for (let input of midiAccess.inputs.values()) addInput(input)
  })

  const absValueSelectors: {
    [controlId: string]: (state: Types.State, control: Types.Control) => any
  } = {}
  let lastControlIds = []

  const handleStoreUpdate = _.throttle(
    () => {
      const state = store.getState(),
        currentControls = Selectors.getControls(state.live),
        currentControlIds = _.keys(currentControls),
        addedControlsIds = _.difference(currentControlIds, lastControlIds),
        removedControlsIds = _.difference(lastControlIds, currentControlIds)

      addedControlsIds.forEach(controlId => {
        absValueSelectors[controlId] = Selectors.makeGetControlAbsValue()
      })
      removedControlsIds.forEach(controlId => {
        delete absValueSelectors[controlId]
      })

      for (let controlId in currentControls) {
        const control = currentControls[controlId],
          binding = state.live.bindings[controlId]
        if (binding && binding.twoway && binding.note) {
          const absValue =
            control && control.absolute
              ? absValueSelectors[controlId](state, control.controls[0])
              : state.live.controlValues[controlId]

          if (absValue !== null) {
            for (let outputId in outputs) {
              if (absValue !== sentMidiValues[outputId][controlId]) {
                outputs[outputId].send([
                  176 + binding.channel,
                  binding.note,
                  Math.floor(absValue * 127),
                ])
              }
            }
            sentMidiValues[controlId] = absValue
          }
        }
      }
      lastControlIds = currentControlIds
    },
    100,
    { leading: false, trailing: true }
  )

  store.subscribe(handleStoreUpdate)
}
