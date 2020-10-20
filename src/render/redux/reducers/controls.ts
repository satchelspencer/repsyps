import { createReducer } from 'deox'
import * as _ from 'lodash'

import * as Types from 'render/util/types'
import * as Actions from '../actions'
import * as Selectors from '../selectors'
import {
  defaultState,
  defaultControlGroup,
  defaultBinding,
  defaultBindings,
} from '../defaults'
import { updateSceneIndex } from './scenes'

function setGroup(
  grid: Types.Grid<Types.ControlGroup>,
  group: Partial<Types.ControlGroup> | null,
  posStr: string
) {
  return group
    ? {
        ...grid,
        [posStr]: {
          ...(grid[posStr] || defaultControlGroup),
          ...group,
        },
      }
    : _.omit(grid, posStr)
}

function setControlGroup(
  state: Types.State,
  controlGroup: Partial<Types.ControlGroup> | null,
  pposition: Types.Position | undefined
) {
  const position = pposition ?? state.live.selectedPosition
  if (!position) return state

  const posStr = Selectors.pos2str(position),
    isGlobal = !!state.live.globalControls[posStr]

  return {
    ...state,
    live: {
      ...state.live,
      globalControls: isGlobal
        ? setGroup(state.live.globalControls, controlGroup, posStr)
        : state.live.globalControls,
      scenes: state.live.scenes.map((scene, sceneIndex) => {
        if (sceneIndex !== state.live.sceneIndex) return scene
        else {
          return {
            ...scene,
            controls: isGlobal
              ? scene.controls
              : setGroup(scene.controls, controlGroup, posStr),
            controlValues: {
              ...scene.controlValues,
              [posStr]:
                controlGroup && controlGroup.absolute ? scene.controlValues[posStr] : 1,
            },
          }
        }
      }),
    },
  }
}

export function getDefaultBindingType(control: Types.Control): Types.BindingType {
  const isNote =
      'cueIndex' in control ||
      'cueStep' in control ||
      'loop' in control ||
      'sync' in control ||
      'periodDelta' in control ||
      'trackStep' in control ||
      'sceneStep' in control ||
      'click' in control ||
      'playPause' in control,
    isJog = 'jog' in control
  if (isNote) return 'note'
  else if (isJog) return 'jog'
  else return 'value'
}

export function getDefaultAbsolute(control: Types.Control) {
  return (
    'globalProp' in control || ('trackIndex' in control && control.trackIndex === null)
  )
}

export default createReducer(defaultState, (handle) => [
  handle(Actions.setControlGroup, (state, { payload }) =>
    setControlGroup(state, payload.controlGroup, payload.position)
  ),
  handle(Actions.addControlToGroup, (state, { payload }) => {
    const position = payload.position || state.live.selectedPosition,
      posStr = Selectors.pos2str(position),
      controls = Selectors.getControls(state),
      selectedControlGroup = controls[posStr],
      currentControls = selectedControlGroup ? selectedControlGroup.controls : [],
      currentType = selectedControlGroup && selectedControlGroup.bindingType,
      type = currentType || getDefaultBindingType(payload.control)

    return setControlGroup(
      state,
      {
        absolute: getDefaultAbsolute(payload.control),
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
    const controls = Selectors.getControls(state),
      srcStr = Selectors.pos2str(payload.src),
      destStr = Selectors.pos2str(payload.dest)

    let newState = state
    newState = setControlGroup(newState, controls[srcStr], payload.dest)
    newState = setControlGroup(newState, controls[destStr], payload.src)
    return newState
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
  handle(Actions.setControlPosGlobal, (state, { payload }) => {
    const position = payload.position || state.live.selectedPosition,
      posStr = Selectors.pos2str(position),
      isGlobal = !!state.live.globalControls[posStr],
      controls = Selectors.getControls(state),
      control = controls[posStr]

    if (isGlobal === payload.global) return state
    else {
      return {
        ...state,
        live: {
          ...state.live,
          globalControls: payload.global
            ? {
                ...state.live.globalControls,
                [posStr]: control,
              }
            : _.omit(state.live.globalControls, posStr),
          scenes: state.live.scenes.map((scene, sceneIndex) => {
            if (sceneIndex !== state.live.sceneIndex) return scene
            else
              return {
                ...scene,
                controls: payload.global
                  ? _.omit(scene.controls, posStr)
                  : {
                      ...scene.controls,
                      [posStr]: control,
                    },
              }
          }),
        },
      }
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
    const position = payload || state.live.selectedPosition
    return setControlGroup(state, null, position)
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
    const maxX =
      _.max(
        _.map(
          [..._.keys(bindingsFile.bindings), ..._.keys(bindingsFile.globalControls)],
          (p) => {
            const pos = Selectors.str2pos(p)
            return pos.x
          }
        )
      ) || 0
    return {
      ...state,
      settings: {
        ...state.settings,
        gridSize: Math.max(maxX + 1, 5),
      },
      live: {
        ...state.live,
        ...bindingsFile,
        globalControls: {
          ...state.live.globalControls,
          ...bindingsFile.globalControls,
        },
      },
    }
  }),
  handle(Actions.resetBindings, (state) => {
    return {
      ...state,
      live: {
        ...state.live,
        bindings: defaultBindings,
        controlPresets: {},
        globalControls: {},
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
