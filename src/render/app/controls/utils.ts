import _ from 'lodash'

import * as Types from 'render/util/types'

const midiFunctions: { [byte: number]: string } = {
    128: 'n',
    144: 'n',
    160: 'pa',
    176: 'c',
    192: 'p',
    207: 'ca',
    224: 'pb',
  },
  midiFnMask = parseInt('11110000', 2)

export function midiName(midi: number) {
  if (midi === null) return ''
  const fnbyte = midi >> 8,
    note = midi & 127,
    channel = fnbyte & 15

  return `${midiFunctions[fnbyte & midiFnMask]}${note}.${channel}`
}

function normIndex(index: number) {
  return index >= 0 ? index + 1 : index
}

function trackIndex2Str(index: number) {
  if (index === null) return 'Current Track'
  else return `Track ${normIndex(index)}`
}

export function getControlName(control: Types.Control) {
  if ('globalProp' in control) return 'Global ' + _.startCase(control.globalProp)
  else if ('sourceTrackProp' in control)
    return `${
      control.sourceTrackProp === 'volume'
        ? ''
        : _.startCase(control.sourceTrackProp) + ''
    }${trackIndex2Str(control.trackIndex)} - Source ${normIndex(
      control.sourceTrackIndex
    )}`
  else if ('trackProp' in control)
    return `${trackIndex2Str(control.trackIndex)} ${_.startCase(control.trackProp)}`
  else if ('cueStep' in control)
    return `${control.cueStep > 0 ? 'Next' : 'Prev'} ${trackIndex2Str(
      control.trackIndex
    )}`
  else if ('cueIndex' in control)
    return `Cue ${normIndex(control.cueIndex)} ${trackIndex2Str(control.trackIndex)}`
  else if ('loop' in control)
    return control.loop === -1
      ? `To End ${trackIndex2Str(control.trackIndex)}`
      : `Loop ${control.loop} ${trackIndex2Str(control.trackIndex)}`
  else if ('sync' in control)
    return `Sync ${_.startCase(control.sync)} ${trackIndex2Str(control.trackIndex)}`
  else if ('relativeSceneIndex' in control)
    return !control.relativeSceneIndex
      ? 'Current Scene'
      : control.relativeSceneIndex === -1
      ? 'Prev Scene'
      : `Scene ${control.relativeSceneIndex < 0 ? '-' : ''}${control.relativeSceneIndex}`
  else if ('periodDelta' in control)
    return `Speed ${control.periodDelta < 0 ? 'Up' : 'Down'}`
  else if ('trackStep' in control && control.trackStep)
    return control.trackStep > 0 ? 'Next Track' : 'Prev Track'
  else if ('sceneStep' in control && control.sceneStep)
    return control.sceneStep > 0 ? 'Next Scene' : 'Prev Scene'
  else if ('jog' in control) return `${trackIndex2Str(control.trackIndex)} Jog`
  else if ('playPause' in control)
    return `${trackIndex2Str(control.trackIndex)} Play/Pause`
  else if ('click' in control) return `${trackIndex2Str(control.trackIndex)} Click`
  else return '???'
}

const propIcons = {
  filter: 'spectrum',
  volume: 'volume',
  delay: 'tape',
  delayGain: 'echo',
}

export function getIcon(control: Types.Control): string | null {
  if ('globalProp' in control) return control.globalProp === 'volume' ? 'volume' : 'timer'
  else if ('sourceTrackProp' in control) return 'wave'
  else if ('trackProp' in control) return propIcons[control.trackProp]
  else if ('cueStep' in control) return control.cueStep > 0 ? 'next' : 'prev'
  else if ('cueIndex' in control) return 'cue'
  else if ('loop' in control) return 'loop'
  else if ('sync' in control) return 'av-timer'
  else if ('relativeSceneIndex' in control) return 'volume'
  else if ('periodDelta' in control) return 'timer'
  else if ('trackStep' in control) return 'next'
  else if ('sceneStep' in control) return 'cheveron-right'
  else if ('jog' in control) return 'jog'
  else if ('playPause' in control) return 'play'
  else if ('click' in control) return 'immediate'
  else return null
}
