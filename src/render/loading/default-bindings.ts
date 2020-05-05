import { Versioned } from './apply-migration'
import * as Types from 'render/util/types'

const defaultBindingsFile: Versioned<Types.BindingsFile> = {
  state: {
    bindings: {},
    controlPresets: {
      '25534149': {
        name: 'A-B Scene',
        controls: {
          '0.0': {
            absolute: false,
            position: { x: 0, y: 0 },
            bindingType: 'value',
            controls: [
              { relativeSceneIndex: -1, invert: false },
              { relativeSceneIndex: 0, invert: true },
            ],
          },
        },
      },
      '16906134e': {
        name: 'Fade-in Scene',
        controls: {
          '0.0': {
            absolute: false,
            position: { x: 0, y: 0 },
            bindingType: 'value',
            controls: [{ relativeSceneIndex: -1, invert: false }],
          },
          '0.1': {
            absolute: false,
            position: { x: 0, y: 1 },
            bindingType: 'value',
            controls: [{ relativeSceneIndex: 0, invert: true }],
          },
        },
      },
      '7e12b2cc': {
        name: 'Cue Steps',
        controls: {
          '1.2': {
            absolute: false,
            position: { x: 1, y: 1 },
            bindingType: 'note',
            controls: [{ trackIndex: 0, cueStep: 1, invert: false }],
          },
          '2.2': {
            absolute: false,
            position: { x: 2, y: 1 },
            bindingType: 'note',
            controls: [{ trackIndex: 1, cueStep: 1, invert: false }],
          },
          '3.2': {
            absolute: false,
            position: { x: 3, y: 1 },
            bindingType: 'note',
            controls: [{ trackIndex: 2, cueStep: 1, invert: false }],
          },
          '1.1': {
            absolute: false,
            position: { x: 1, y: 1 },
            bindingType: 'note',
            controls: [{ trackIndex: 0, cueStep: -1, invert: false }],
          },
          '2.1': {
            absolute: false,
            position: { x: 2, y: 1 },
            bindingType: 'note',
            controls: [{ trackIndex: 1, cueStep: -1, invert: false }],
          },
          '3.1': {
            absolute: false,
            position: { x: 3, y: 1 },
            bindingType: 'note',
            controls: [{ trackIndex: 2, cueStep: -1, invert: false }],
          },
        },
      },
      '1ba0a0f31': {
        name: 'Track Volumes',
        controls: {
          '1.0': {
            absolute: false,
            position: { x: 1, y: 0 },
            bindingType: 'value',
            controls: [{ trackIndex: 0, trackProp: 'volume', invert: false }],
          },
          '2.0': {
            absolute: false,
            position: { x: 2, y: 0 },
            bindingType: 'value',
            controls: [{ trackIndex: 1, trackProp: 'volume', invert: false }],
          },
          '3.0': {
            absolute: false,
            position: { x: 3, y: 0 },
            bindingType: 'value',
            controls: [{ trackIndex: 2, trackProp: 'volume', invert: false }],
          },
        },
      },
      '1e1cf22f0': {
        name: 'Track Filters',
        controls: {
          '4.0': {
            absolute: true,
            position: { x: 4, y: 0 },
            bindingType: 'value',
            controls: [{ trackIndex: 0, trackProp: 'filter', invert: false }],
          },
          '5.0': {
            absolute: true,
            position: { x: 5, y: 0 },
            bindingType: 'value',
            controls: [{ trackIndex: 1, trackProp: 'filter', invert: false }],
          },
          '6.0': {
            absolute: true,
            position: { x: 6, y: 0 },
            bindingType: 'value',
            controls: [{ trackIndex: 2, trackProp: 'filter', invert: false }],
          },
        },
      },
    },
    globalControls: {},
  },
  version: '0.0.0',
}

export default defaultBindingsFile
