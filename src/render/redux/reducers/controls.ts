import { createReducer } from 'deox'
import * as _ from 'lodash'

import * as Actions from '../actions'
import * as Selectors from '../selectors'
import {
  defaultState,
  defaultControlGroup,
  defaultTiming,
  defaultBinding,
} from '../defaults'
import { updateSceneIndex } from './scenes'
import { stat } from 'fs'

export default createReducer(defaultState, (handle) => [
  handle(Actions.setControlGroup, (state, { payload }) => {
    const posStr = Selectors.pos2str(payload.position)
    return {
      ...state,
      live: {
        ...state.live,
        controlValues: {
          ...state.live.controlValues,
          [posStr]: payload.controlGroup.absolute ? state.live.controlValues[posStr] : 1,
        },
        scenes: state.live.scenes.map((scene, sceneIndex) => {
          if (sceneIndex !== state.live.sceneIndex) return scene
          else {
            const newControlGroup = {
              ...(scene.controls[posStr] || defaultControlGroup),
              ...payload.controlGroup,
            }
            return {
              ...scene,
              controls: {
                ...scene.controls,
                [posStr]: newControlGroup,
              },
            }
          }
        }),
      },
    }
  }),
  handle(Actions.setControlGroupValue, (state, { payload }) => {
    return {
      ...state,
      live: {
        ...state.live,
        controlValues: {
          ...state.live.controlValues,
          [Selectors.pos2str(payload.position)]: payload.value,
        },
      },
    }
  }),
  handle(Actions.moveControlGroup, (state, { payload }) => {
    return {
      ...state,
      live: {
        ...state.live,
        scenes: state.live.scenes.map((scene, sceneIndex) => {
          if (sceneIndex !== state.live.sceneIndex) return scene
          else {
            const srcStr = Selectors.pos2str(payload.src),
              destStr = Selectors.pos2str(payload.dest)
            return {
              ...scene,
              controls: _.pickBy(
                {
                  ...scene.controls,
                  [srcStr]: scene.controls[destStr],
                  [destStr]: scene.controls[srcStr],
                },
                (a) => a
              ),
            }
          }
        }),
      },
    }
  }),
  handle(Actions.setInitValue, (state, { payload }) => {
    return {
      ...state,
      live: {
        ...state.live,
        initValues: {
          ...state.live.initValues,
          [Selectors.pos2str(payload.position)]: payload.value,
        },
      },
    }
  }),
  handle(Actions.zeroInitValues, (state) => {
    return updateSceneIndex(
      {
        ...state,
        playback: {
          ...state.playback,
          playing: false,
        },
        timing: defaultTiming,
      },
      state.live.sceneIndex,
      true
    )
  }),
  handle(Actions.clearControls, (state) => {
    return {
      ...state,
      live: {
        ...state.live,
        scenes: state.live.scenes.map((scene, sceneIndex) => {
          if (sceneIndex !== state.live.sceneIndex) return scene
          else {
            return {
              ...scene,
              controls: {},
            }
          }
        }),
      },
    }
  }),
  handle(Actions.deleteControlGroup, (state, { payload }) => {
    return {
      ...state,
      live: {
        ...state.live,
        scenes: state.live.scenes.map((scene, sceneIndex) => {
          if (sceneIndex !== state.live.sceneIndex) return scene
          else
            return {
              ...scene,
              controls: _.omit(scene.controls, Selectors.pos2str(payload.position)),
            }
        }),
      },
    }
  }),
  handle(Actions.addControlPreset, (state, { payload }) => {
    return {
      ...state,
      live: {
        ...state.live,
        controlPresets: {
          ...state.live.controlPresets,
          [payload.presetId]: {
            name: payload.name,
            controls: { ...state.live.scenes[state.live.sceneIndex].controls },
          },
        },
      },
    }
  }),
  handle(Actions.deleteControlPreset, (state, { payload: presetId }) => {
    return {
      ...state,
      live: {
        ...state.live,
        controlPresets: _.omit(state.live.controlPresets, presetId),
        defaultPresetId:
          state.live.defaultPresetId === presetId ? null : state.live.defaultPresetId,
      },
    }
  }),
  handle(Actions.setDefaultControlPreset, (state, { payload: presetId }) => {
    return {
      ...state,
      live: {
        ...state.live,
        defaultPresetId: presetId,
      },
    }
  }),
  handle(Actions.applyControlPreset, (state, { payload: presetId }) => {
    const preset = state.live.controlPresets[presetId]
    if (!preset) return state
    else
      return {
        ...state,
        live: {
          ...state.live,
          scenes: state.live.scenes.map((scene, sceneIndex) => {
            if (sceneIndex === state.live.sceneIndex) {
              return {
                ...scene,
                controls: {
                  ...scene.controls,
                  ...preset.controls, //MERGING CONTROLS?
                },
              }
            } else return scene
          }),
        },
      }
  }),
  handle(Actions.setControlsEnabled, (state, { payload: enabled }) => {
    return {
      ...state,
      live: {
        ...state.live,
        controlsEnabled: enabled,
      },
    }
  }),
  handle(Actions.setBinding, (state, { payload }) => {
    const posStr = Selectors.pos2str(payload.position)
    return {
      ...state,
      live: {
        ...state.live,
        bindings: {
          ...state.live.bindings,
          [posStr]: {
            ...defaultBinding,
            ...state.live.bindings[posStr],
            ...payload.binding,
          },
        },
      },
    }
  }),
  handle(Actions.removeBinding, (state, { payload }) => {
    return {
      ...state,
      live: {
        ...state.live,
        bindings: _.omit(state.live.bindings, Selectors.pos2str(payload)),
      },
    }
  }),
  handle(Actions.loadBindings, (state, { payload: bindingsFile }) => {
    return {
      ...state,
      live: {
        ...state.live,
        ...bindingsFile,
      },
    }
  }),
  handle(Actions.setBadMidiValue, (state, { payload }) => {
    const posStr = Selectors.pos2str(payload.position)
    return {
      ...state,
      live: {
        ...state.live,
        bindings: {
          ...state.live.bindings,
          [posStr]: {
            ...state.live.bindings[posStr],
            badMidiValue: payload.badMidiValue,
            lastMidiValue:
              payload.lastMidiValue === undefined
                ? state.live.bindings[posStr].lastMidiValue
                : payload.lastMidiValue,
          },
        },
      },
    }
  }),
])
