import { createReducer } from 'deox'
import * as _ from 'lodash'

import audio from 'render/util/audio'
import * as Types from 'render/util/types'
import * as Actions from '../actions'
import * as Selectors from '../selectors'
import {
  defaultState,
  defaultControlGroup,
  defaultBinding,
  defaultBindings,
  defaultControlPresets,
} from '../defaults'
import { updateSceneIndex } from './scenes'

function setControlGroup(
  state: Types.State,
  controlGroup: Partial<Types.ControlGroup>,
  pposition: Types.Position
) {
  const position = pposition || state.live.selectedPosition
  if (!position) return state

  const posStr = Selectors.pos2str(position)
  return {
    ...state,
    live: {
      ...state.live,
      scenes: state.live.scenes.map((scene, sceneIndex) => {
        if (sceneIndex !== state.live.sceneIndex) return scene
        else {
          const newControlGroup = {
            ...(scene.controls[posStr] || defaultControlGroup),
            ...controlGroup,
          }
          return {
            ...scene,
            controls: {
              ...scene.controls,
              [posStr]: newControlGroup,
            },
            controlValues: {
              ...scene.controlValues,
              [posStr]: controlGroup.absolute ? scene.controlValues[posStr] : 1,
            },
          }
        }
      }),
    },
  }
}

export function getDefaultBindingType(control: Types.Control): Types.BindingType {
  return 'cueIndex' in control ||
    'cueStep' in control ||
    'loop' in control ||
    'sync' in control ||
    'periodDelta' in control
    ? 'note'
    : 'value'
}

export default createReducer(defaultState, (handle) => [
  handle(Actions.setControlGroup, (state, { payload }) =>
    setControlGroup(state, payload.controlGroup, payload.position)
  ),
  handle(Actions.addControlToGroup, (state, { payload }) => {
    const position = payload.position || state.live.selectedPosition,
      posStr = Selectors.pos2str(position),
      selectedControlGroup = state.live.scenes[state.live.sceneIndex].controls[posStr],
      currentControls = selectedControlGroup ? selectedControlGroup.controls : [],
      currentType = selectedControlGroup && selectedControlGroup.bindingType,
      type = currentType || getDefaultBindingType(payload.control)

    return setControlGroup(
      state,
      {
        absolute: 'globalProp' in payload.control,
        bindingType: type,
        position: position,
        controls: [...currentControls, payload.control],
      },
      payload.position
    )
  }),
  handle(Actions.setControlGroupValue, (state, { payload }) => {
    return {
      ...state,
      live: {
        ...state.live,
        scenes: state.live.scenes.map((scene, sceneIndex) => {
          if (sceneIndex !== state.live.sceneIndex) return scene
          else
            return {
              ...scene,
              controlValues: {
                ...scene.controlValues,
                [Selectors.pos2str(payload.position)]: payload.value,
              },
            }
        }),
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
        scenes: state.live.scenes.map((scene, sceneIndex) => {
          if (sceneIndex !== state.live.sceneIndex) return scene
          else
            return {
              ...scene,
              initValues: {
                ...scene.initValues,
                [Selectors.pos2str(payload.position)]: payload.value,
              },
            }
        }),
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
    const position = payload || state.live.selectedPosition,
      posStr = Selectors.pos2str(position)
    return {
      ...state,
      live: {
        ...state.live,
        scenes: state.live.scenes.map((scene, sceneIndex) => {
          if (sceneIndex !== state.live.sceneIndex) return scene
          else
            return {
              ...scene,
              controls: _.omit(scene.controls, posStr),
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
        controlsEnabled: enabled === null ? !state.live.controlsEnabled : enabled,
      },
    }
  }),
  handle(Actions.setBinding, (state, { payload }) => {
    const position = payload.position || state.live.selectedPosition,
      posStr = Selectors.pos2str(position)
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
    const position = payload || state.live.selectedPosition,
      posStr = Selectors.pos2str(position)
    return {
      ...state,
      live: {
        ...state.live,
        bindings: _.omit(state.live.bindings, posStr),
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
  handle(Actions.resetBindings, (state) => {
    return {
      ...state,
      live: {
        ...state.live,
        bindings: defaultBindings,
        controlPresets: defaultControlPresets,
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
  handle(Actions.setSelectedPosition, (state, { payload: position }) => {
    return {
      ...state,
      live: {
        ...state.live,
        selectedPosition: position,
      },
    }
  }),
])
