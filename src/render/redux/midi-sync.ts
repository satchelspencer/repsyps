import { Store } from 'redux'
import _ from 'lodash'
import { batchActions } from 'redux-batched-actions'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import { call } from 'render/util/track-events'

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
  midiChanges: { [upperBytes: number]: number } = {},
  midiCounts: { [upperBytes: number]: number } = {},
  mcps: { [upper: number]: boolean } = {},
  waitingBinding: Types.Binding = null

export default async function init(store: Store<Types.State>) {
  const handleMessage = (portName) => {
      const state = store.getState(),
        controls = Selectors.getControls(state),
        controlValues = Selectors.getCurrentControlValues(state)

      if (!state.live.controlsEnabled) return

      let upper: any,
        leastNote = Infinity,
        leastUpper: number = null,
        leastFn: Types.MidiFunctionName = null

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
          leastFn = fn
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
            lastValue = controlValues[posStr] || 0
          midiValues[portName][posStr] = normValue

          if (control) {
            const absValue =
              control && control.absolute
                ? absValueSelectors[posStr](state, control.controls[0])
                : controlValues[posStr]

            if (
              binding.twoway ||
              !binding.badMidiValue ||
              Math.abs(normValue - absValue) < 0.02 ||
              control.bindingType === 'jog'
            ) {
              store.dispatch(
                Actions.applyControlGroupMidi(position, control, lastValue, normValue)
              )
              control.controls.forEach((control) => {
                if ('jog' in control) {
                  const trackId = Selectors.getTrackIdByIndex(
                    state.live,
                    control.trackIndex
                  )
                  if (trackId) call(trackId, 'jog', midiCounts[binding.midi])
                } else if ('click' in control) {
                  const trackId = Selectors.getTrackIdByIndex(
                    state.live,
                    control.trackIndex
                  )
                  if (trackId) call(trackId, 'click', normValue > 0)
                }
              })
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
      midiCounts = {}
    },
    throttledHandle = _.throttle(handleMessage, 50, { trailing: false }),
    wrappedThrottleHandle = (message, portName) => {
      const [fn, note, value] = message.data,
        fname = getFunction(fn),
        mappedFn = fname === 'note' ? 144 + (midiChannelMask & fn) : fn,
        mcpCheckUpper = (mappedFn << 8) + (fname === 'pitch-bend' ? 0 : note),
        isMCP = mcps[mcpCheckUpper] || (waitingBinding && waitingBinding.mcp),
        upper = isMCP ? mcpCheckUpper : (mappedFn << 8) + note,
        signedDelta = isMCP ? (value > 64 ? 64 - value : value) : value - 64

      midiChanges[upper] = value
      midiCounts[upper] = (midiCounts[upper] || 0) + signedDelta
      outputs[portName].send(message.data, message.timeStamp)
      if (value === 0 || value === 127 || instantFunctions.includes(fname)) {
        handleMessage(portName)
        throttledHandle.flush()
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

      // const header = [0xf0, 0, 0, 0x66, 0x14]
      // // port.send([...header, 0, 0xf7])

      // setInterval(() => {
      //   port.send([0x90, 0x00, 0x])
      // }, 1000)

      handleStoreUpdate()
    },
    removeOutput = (port) => {
      delete outputs[port.name]
      delete midiValues[port.name]
    }

  nav.requestMIDIAccess({ sysex: true }).then((midiAccess) => {
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
        currentControls = Selectors.getControls(state),
        controlValues = Selectors.getCurrentControlValues(state),
        currentControlIds = _.keys(currentControls),
        addedControlsIds = _.difference(currentControlIds, lastControlIds),
        removedControlsIds = _.difference(lastControlIds, currentControlIds)

      mcps = Selectors.getMcpFunctions(state)
      waitingBinding = null

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
          const fn = binding.midi >> 8,
            absValue =
              control && control.absolute
                ? absValueSelectors[controlPos](state, control.controls[0])
                : controlValues[controlPos]

          if (absValue !== null) {
            const normedValue = instantFunctions.includes(midiFunctions[fn & midiFnMask])
              ? 1 - absValue
              : absValue
            for (let outputId in outputs) {
              const midiValue = midiValues[outputId][controlPos]
              if (midiValue === undefined || Math.abs(normedValue - midiValue) > 0.02) {
                if (binding.twoway) {
                  const note = binding.midi & 127
                  outputs[outputId].send([
                    fn,
                    midiFunctions[fn & midiFnMask] === 'pitch-bend' ? 0 : note,
                    Math.floor(normedValue * 127),
                  ])
                } else if (!binding.badMidiValue) {
                  store.dispatch(
                    Actions.setBadMidiValue({
                      position: Selectors.str2pos(controlPos),
                      badMidiValue: true,
                    })
                  )
                }
                midiValues[outputId][controlPos] = normedValue
              }
            }
          }
        }
        if (binding && binding.waiting) {
          waitingBinding = binding
        }
      }
      lastControlIds = currentControlIds
    },
    100,
    { leading: false, trailing: true }
  )

  store.subscribe(handleStoreUpdate)
}
