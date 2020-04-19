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
  midiFnMask = parseInt('11110000', 2),
  midiChannelMask = parseInt('00001111', 2),
  getFunction = (byte: number) => midiFunctions[byte & midiFnMask],
  nav: any = navigator, //any so as to allow web midi api
  outputs: { [portId: string]: any } = {}, //web midi output (no type defs)
  midiValues: { [portName: string]: { [controlId: string]: number } } = {},
  absValueSelectors: {
    [controlId: string]: (state: Types.State, control: Types.Control) => any
  } = {}
let lastControlIds = [],
  midiChanges: { [upperBytes: number]: number } = {}

export default async function init(store: Store<Types.State>) {
  const handleMessage = (portName) => {
      const state = store.getState(),
        controls = Selectors.getControls(state.live)

      if (!state.live.controlsEnabled) return

      let upper: any,
        leastNote = Infinity,
        leastUpper: number = null

      for (upper in midiChanges) {
        upper = parseInt(upper, 10)
        const value = midiChanges[upper],
          fnbyte = upper >> 8,
          note = upper & 127,
          fn = getFunction(fnbyte & midiFnMask)

        /* replace with normed values */
        midiChanges[upper] = instantFunctions.includes(fn) ? 1 - value / 127 : value / 127

        if (note < leastNote) {
          leastNote = note
          leastUpper = upper
        }
      }

      for (let posStr in state.live.bindings) {
        const binding = state.live.bindings[posStr],
          position = Selectors.str2pos(posStr),
          normValue = midiChanges[binding.midi]

        if (binding.waiting) {
          store.dispatch(
            batchActions(
              [
                Actions.setBinding({
                  position,
                  binding: {
                    ...binding,
                    midi: leastUpper,
                    waiting: false,
                  },
                }),
                Actions.setInitValue({
                  position,
                  value: 1,
                }),
                Actions.setControlGroupValue({
                  position,
                  value: midiChanges[leastUpper],
                }),
              ],
              'BIND_MIDI'
            )
          )
          break
        } else if (normValue !== undefined) {
          const control = controls[posStr],
            lastValue = state.live.controlValues[posStr] || 0
          midiValues[portName][posStr] = normValue

          if (control) {
            const absValue =
              control && control.absolute
                ? absValueSelectors[posStr](state, control.controls[0])
                : state.live.controlValues[posStr]

            if (
              binding.twoway ||
              !binding.badMidiValue ||
              Math.abs(normValue - absValue) < 0.02
            ) {
              store.dispatch(
                Actions.applyControlGroupMidi(position, control, lastValue, normValue)
              )
            } else if (binding.badMidiValue) {
              store.dispatch(
                Actions.setBadMidiValue({
                  position,
                  badMidiValue: true,
                  lastMidiValue: normValue,
                })
              )
            }
          }
        }
      }
      midiChanges = {}
    },
    throttledHandle = _.throttle(handleMessage, 100, { trailing: true }),
    wrappedThrottleHandle = (message, portName) => {
      const [fn, note, value] = message.data,
        fname = getFunction(fn),
        mappedFn = fname === 'note' ? 144 + (midiChannelMask & fn) : fn

      midiChanges[(mappedFn << 8) + note] = value

      if (value === 0 || value === 127 || instantFunctions.includes(fname)) {
        handleMessage(portName)
        //throttledHandle(portName)
      } else throttledHandle(portName)
    },
    addInput = (port) => {
      console.log('connect', port.name)
      port.onmidimessage = (mes) => wrappedThrottleHandle(mes, port.name)
    },
    removeInput = (port) => {
      console.log('disconnect', port.name)
    },
    addOutput = (port) => {
      midiValues[port.name] = midiValues[port.name] || {}
      outputs[port.name] = port
      port.send([255])
      handleStoreUpdate()
    },
    removeOutput = (port) => {
      delete outputs[port.name]
      delete midiValues[port.name]
    }

  nav.requestMIDIAccess().then((midiAccess) => {
    midiAccess.onstatechange = (e) => {
      if (e.port.type === 'input') {
        if (e.port.state === 'connected') addInput(e.port)
        else if (e.port.state === 'disconnected') removeInput(e.port)
      } else if (e.port.type === 'output') {
        if (e.port.state === 'connected') addOutput(e.port)
        else if (e.port.state === 'disconnected') removeOutput(e.port)
      }
    }
    for (let output of midiAccess.outputs.values()) addOutput(output)
    for (let input of midiAccess.inputs.values()) addInput(input)
  })

  const handleStoreUpdate = _.throttle(
    () => {
      const state = store.getState(),
        currentControls = Selectors.getControls(state.live),
        currentControlIds = _.keys(currentControls),
        addedControlsIds = _.difference(currentControlIds, lastControlIds),
        removedControlsIds = _.difference(lastControlIds, currentControlIds)

      addedControlsIds.forEach((controlId) => {
        absValueSelectors[controlId] = Selectors.makeGetControlAbsValue()
      })
      removedControlsIds.forEach((controlId) => {
        delete absValueSelectors[controlId]
      })

      for (let controlPos in currentControls) {
        const control = currentControls[controlPos],
          binding = state.live.bindings[controlPos]
        if (binding && binding.midi) {
          const absValue =
            control && control.absolute
              ? absValueSelectors[controlPos](state, control.controls[0])
              : state.live.controlValues[controlPos]
          if (absValue !== null) {
            for (let outputId in outputs) {
              const midiValue = midiValues[outputId][controlPos]
              if (midiValue === undefined || Math.abs(absValue - midiValue) > 0.02) {
                if (binding.twoway) {
                  const note = binding.midi & 127,
                    fn = binding.midi >> 8
                  outputs[outputId].send([fn, note, Math.floor(absValue * 127)])
                } else if (!binding.badMidiValue) {
                  store.dispatch(
                    Actions.setBadMidiValue({
                      position: Selectors.str2pos(controlPos),
                      badMidiValue: true,
                    })
                  )
                }
                midiValues[outputId][controlPos] = absValue
              }
            }
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
