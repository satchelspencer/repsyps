import React, { useEffect } from 'react'
import electron from 'electron'
import { Store } from 'redux'
import pathUtils from 'path'
import _ from 'lodash'
import localShortcut from 'electron-localshortcut'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import { defaultState } from 'render/redux/defaults'

import { useSelection } from 'render/components/selection'
import { useDispatch, useSelector, useStore } from 'render/redux/react'

import { getPath, getAppPath } from 'render/loading/app-paths'
import { loadBindings, saveBindings } from 'render/loading/bindings'
import {
  loadProject,
  saveProject,
  exportProject,
  loadProjectScenes,
  exportCurrentScene,
} from 'render/loading/project'
import { undo, redo } from 'render/redux/history'
import audio from 'render/util/audio'

const { Menu, dialog, getCurrentWindow } = electron.remote,
  isMac = process.platform === 'darwin'

export default function init() {
  const store = useStore()

  const { getSelection } = useSelection<Types.Control>('control')

  useEffect(() => {
    let menuState: Types.MenuState = Selectors.getMenuState(defaultState),
      inInput = false,
      inWrapper = false

    document.addEventListener('focusin', () => {
      const nodeName = document.activeElement.nodeName,
        newInInput = nodeName === 'INPUT'

      inWrapper = nodeName !== 'BODY'
      if (inInput !== newInInput) {
        inInput = newInInput
        handleUpdate()
      }
    })

    const commands: {
      [name: string]: {
        click: () => any
        accelerator?: string
      }
    } = {
      newProject: {
        click: () => store.dispatch(Actions.reset()),
        accelerator: 'CmdOrCtrl+Shift+N',
      },
      openProject: {
        click: () => {
          const path = dialog.showOpenDialog({
            defaultPath: getPath('projects'),
            filters: [{ name: 'repsyps project', extensions: ['syp'] }],
            buttonLabel: 'Open Project',
          })
          if (path && path[0]) loadProject(path[0], store)
        },
        accelerator: 'CmdOrCtrl+O',
      },
      saveProject: {
        click: () => {
          const savedPath = store.getState().save.path
          if (savedPath) saveProject(savedPath, store)
          else saveAs()
        },
        accelerator: 'CmdOrCtrl+S',
      },
      saveProjectAs: {
        click: saveAs,
        accelerator: 'CmdOrCtrl+Shift+S',
      },
      exportProject: {
        click: () => {
          const path = dialog.showSaveDialog({
            nameFieldLabel: 'Project Name',
            title: 'Export Project',
            defaultPath: getPath('projects'),
            buttonLabel: 'Export Project',
          })
          if (path) exportProject(path, store)
        },
        accelerator: 'CmdOrCtrl+E',
      },
      exportScene: {
        click: () => {
          const path = dialog.showSaveDialog({
            nameFieldLabel: 'Project Name',
            title: 'Save Project',
            defaultPath: getPath('projects/untitled'),
            buttonLabel: 'Export Scene',
          })
          if (path) exportCurrentScene(path + '.syp', store)
        },
        accelerator: 'CmdOrCtrl+Shift+E',
      },
      exportTrack: {
        click: () => {
          const state = store.getState(),
            selectedTrackId = Selectors.getSelectedTrackId(state),
            name = state.sources[selectedTrackId].name
          if (!selectedTrackId) return
          const path = dialog.showSaveDialog({
            nameFieldLabel: 'Track Name',
            defaultPath:
              getAppPath('documents') + pathUtils.basename(name, pathUtils.extname(name)),
            buttonLabel: 'Export Track',
          })
          if (path) audio.exportSource(path + '.m4a', selectedTrackId)
        },
        accelerator: 'CmdOrCtrl+Alt+E',
      },
      import: {
        click: () => {
          const paths = dialog.showOpenDialog({
            properties: ['openFile'],
            message: 'Import Audio or Scenes',
            buttonLabel: 'Inmport',
          })
          if (paths)
            paths.forEach((path) => {
              if (pathUtils.extname(path) === '.syp') {
                loadProjectScenes(path, menuState.sceneIndex + 1, store)
              } else store.dispatch(Actions.addTrackAndSource(path))
            })
        },
        accelerator: 'CmdOrCtrl+I',
      },
      record: {
        click: () =>
          store.dispatch(Actions.setRecording({ enabled: true, fromTrack: null })),
        accelerator: 'CmdOrCtrl+Shift+R',
      },
      recordFromTrack: {
        click: () => {
          store.dispatch(
            Actions.setRecording({
              enabled: true,
              fromTrack: Selectors.getSelectedTrackId(store.getState()),
            })
          )
        },
        accelerator: 'CmdOrCtrl+Alt+R',
      },
      findMissing: {
        click: () => store.dispatch(Actions.setModalRoute('relink')),
        accelerator: 'CmdOrCtrl+F',
      },
      undo: {
        click: undo,
        accelerator: 'CmdOrCtrl+Z',
      },
      redo: {
        click: redo,
        accelerator: 'CmdOrCtrl+Shift+Z',
      },
      editTrack: {
        click: () =>
          store.dispatch(
            Actions.editTrack({
              trackId: menuState.selectedTrackId,
              edit: !menuState.editing,
            })
          ),
        accelerator: 'E',
      },
      inferDivisions: {
        click: () =>
          store.dispatch(
            Actions.inferBounds({
              sourceId: menuState.selectedTrackId,
              direction: 'both',
              snap: true,
            })
          ),
        accelerator: '\\',
      },
      inferLeft: {
        click: () =>
          store.dispatch(
            Actions.inferBounds({
              sourceId: menuState.selectedTrackId,
              direction: 'left',
              snap: true,
            })
          ),
        accelerator: '[',
      },
      inferRight: {
        click: () =>
          store.dispatch(
            Actions.inferBounds({
              sourceId: menuState.selectedTrackId,
              direction: 'right',
              snap: true,
            })
          ),
        accelerator: ']',
      },
      clearDivisions: {
        click: () =>
          store.dispatch(
            Actions.setSourceBounds({
              sourceId: menuState.selectedTrackId,
              bounds: [],
            })
          ),
        accelerator: 'K',
      },
      resetScene: {
        click: () => store.dispatch(Actions.zeroInitValues()),
        accelerator: 'CmdOrCtrl+R',
      },
      pauseAll: {
        click: () =>
          store.dispatch(
            Actions.updatePlayback({
              playing: !menuState.playing,
            })
          ),
        accelerator: 'Shift+Space',
      },
      stopAll: {
        click: () => store.dispatch(Actions.stopAll()),
        accelerator: 'CmdOrCtrl+Shift+Space',
      },
      newScene: {
        click: () => {
          store.dispatch(Actions.selectTrackExclusive(null))
          store.dispatch(Actions.createScene(menuState.sceneIndex + 1))
        },
        accelerator: 'CmdOrCtrl+N',
      },
      newSceneBefore: {
        click: () => {
          store.dispatch(Actions.selectTrackExclusive(null))
          store.dispatch(Actions.createScene(menuState.sceneIndex))
        },
        accelerator: 'CmdOrCtrl+Alt+N',
      },
      importSceneNext: {
        click: () => {
          const path = dialog.showOpenDialog({
            defaultPath: getPath('projects'),
            filters: [{ name: 'repsyps project', extensions: ['syp'] }],
            buttonLabel: 'Import Next',
          })
          if (path && path[0]) loadProjectScenes(path[0], menuState.sceneIndex + 1, store)
        },
        accelerator: 'CmdOrCtrl+Shift+I',
      },
      importSceneEnd: {
        click: () => {
          const path = dialog.showOpenDialog({
            defaultPath: getPath('projects'),
            filters: [{ name: 'repsyps project', extensions: ['syp'] }],
            buttonLabel: 'Import to End',
          })
          if (path && path[0]) loadProjectScenes(path[0], menuState.scenesCount, store)
        },
        accelerator: 'CmdOrCtrl+Alt+I',
      },
      prevTrack: {
        click: () => store.dispatch(Actions.stepSelectedTrack(-1)),
        accelerator: 'Up',
      },
      nextTrack: {
        click: () => store.dispatch(Actions.stepSelectedTrack(1)),
        accelerator: 'Down',
      },
      skipNextScene: {
        click: () => store.dispatch(Actions.cycleScenes(menuState.sceneIndex + 1)),
        accelerator: 'CmdOrCtrl+Shift+.',
      },
      delNextScene: {
        click: () => store.dispatch(Actions.deleteScene(menuState.sceneIndex + 1)),
        accelerator: 'CmdOrCtrl+Alt+.',
      },
      delFollowing: {
        click: () => store.dispatch(Actions.deleteAfter(menuState.sceneIndex)),
        accelerator: 'CmdOrCtrl+Alt+Shift+.',
      },
      delScene: {
        click: () => store.dispatch(Actions.deleteScene(menuState.sceneIndex)),
        accelerator: 'CmdOrCtrl+Shift+Backspace',
      },
      duplicateTrack: {
        click: () => {
          const selectedTrackId = Selectors.getSelectedTrackId(store.getState())
          if (!selectedTrackId) return
          store.dispatch(Actions.duplicateTrack(selectedTrackId))
        },
        accelerator: 'CmdOrCtrl+D',
      },
      playPauseTrack: {
        click: () => store.dispatch(Actions.playPauseTrack(menuState.selectedTrackId)),
        accelerator: 'Space',
      },
      playToEndTrack: {
        click: () =>
          store.dispatch(
            Actions.loopTrack({ trackId: menuState.selectedTrackId, loop: -1 })
          ),
        accelerator: 'P',
      },
      muteTrack: {
        click: () =>
          store.dispatch(Actions.setTrackMuted({ trackId: menuState.selectedTrackId })),
        accelerator: 'M',
      },
      soloTrack: {
        click: () =>
          store.dispatch(Actions.setTrackSolo({ trackId: menuState.selectedTrackId })),
        accelerator: 'S',
      },
      syncOnTrack: {
        click: () =>
          store.dispatch(
            Actions.setTrackSync({ trackId: menuState.selectedTrackId, sync: 'on' })
          ),
        accelerator: 'Tab',
      },
      syncOffTrack: {
        click: () =>
          store.dispatch(
            Actions.setTrackSync({
              trackId: menuState.selectedTrackId,
              sync: 'off',
            })
          ),
        accelerator: '`',
      },
      syncLockTrack: {
        click: () =>
          store.dispatch(
            Actions.setTrackSync({
              trackId: menuState.selectedTrackId,
              sync: 'lock',
            })
          ),
        accelerator: 'Alt+Tab',
      },
      nextCue: {
        click: () =>
          store.dispatch(
            Actions.stepTrackCue({
              trackId: menuState.selectedTrackId,
              cueStep: 1,
            })
          ),
        accelerator: 'Right',
      },
      prevCue: {
        click: () => {
          store.dispatch(
            Actions.stepTrackCue({
              trackId: menuState.selectedTrackId,
              cueStep: -1,
            })
          )
        },
        accelerator: 'Left',
      },
      newCue: {
        click: () => {
          store.dispatch(
            Actions.addCue({
              trackId: menuState.selectedTrackId,
              cue: {
                playback: {
                  chunkIndex: -1,
                  playing: true,
                },
                startBehavior: 'immediate',
              },
            })
          )
        },
        accelerator: 'CmdOrCtrl+Enter',
      },
      delTrack: {
        click: () => {
          const selectedTrackId = Selectors.getSelectedTrackId(store.getState())
          if (selectedTrackId) store.dispatch(Actions.rmTrack(selectedTrackId))
        },
        accelerator: 'CmdOrCtrl+Backspace',
      },
      addControl: {
        click: async () => {
          const control = await getSelection()
          if (!control) return
          store.dispatch(Actions.addControlToGroup({ control }))
        },
        accelerator: 'CmdOrCtrl+B',
      },
      setMidi: {
        click: () =>
          store.dispatch(
            Actions.setBinding({
              binding: {
                waiting: true,
              },
            })
          ),
        accelerator: 'CmdOrCtrl+M',
      },
      clearControls: {
        click: () => store.dispatch(Actions.clearControls()),
        accelerator: 'Alt+Shift+B',
      },
      disableControls: {
        click: () => store.dispatch(Actions.setControlsEnabled(null)),
        accelerator: 'Alt+B',
      }, 
      openBindings: {
        click: () => {
          const path = dialog.showOpenDialog({
            defaultPath: getPath('bindings'),
            filters: [{ name: 'repsyps binding', extensions: ['rbind'] }],
            buttonLabel: 'Load Bindings',
          })
          if (path && path[0]) loadBindings(path[0], store)
        },
      },
      saveBindings: {
        click: () => {
          const path = dialog.showSaveDialog({
            title: 'Save Contol Bindings',
            nameFieldLabel: 'Config Name',
            defaultPath: getPath('bindings/untitled'),
            buttonLabel: 'Save Bindings',
          })
          if (path) saveBindings(path + '.rbind', store)
        },
      },
      clearBindings: {
        click: () => store.dispatch(Actions.resetBindings()),
      },
      trackScroll: {
        click: () => {
          const currentScroll = store.getState().settings.trackScroll
          store.dispatch(
            Actions.setSettings({
              trackScroll: !currentScroll,
            })
          )
        },
        accelerator: 'CmdOrCtrl+Shift+T',
      },
      darkMode: {
        click: () => {
          const currentDark = store.getState().settings.darkMode
          store.dispatch(
            Actions.setSettings({
              darkMode: !currentDark,
            })
          )
        },
        accelerator: 'CmdOrCtrl+Shift+D',
      },
      highRate: {
        click: () => store.dispatch(Actions.setSettings({ updateRate: 'high' })),
      },
      medRate: {
        click: () => store.dispatch(Actions.setSettings({ updateRate: 'medium' })),
      },
      lowRate: {
        click: () => store.dispatch(Actions.setSettings({ updateRate: 'low' })),
      },
      resetZoom: {
        click: () =>
          store.dispatch(
            Actions.setSettings({
              size: 11,
            })
          ),
        accelerator: 'CmdOrCtrl+0',
      },
      zoomIn: {
        click: () => {
          const currentSize = store.getState().settings.size
          store.dispatch(
            Actions.setSettings({
              size: currentSize + 1,
            })
          )
        },
        accelerator: 'CmdOrCtrl+Shift+Plus',
      },
      zoomOut: {
        click: () => {
          const currentSize = store.getState().settings.size
          store.dispatch(
            Actions.setSettings({
              size: currentSize - 1,
            })
          )
        },
        accelerator: 'CmdOrCtrl+Shift+-',
      },
      exitModal: {
        click: () => store.dispatch(Actions.setModalRoute(null)),
        accelerator: 'Escape',
      },
    }

    const bwindow = getCurrentWindow()
    _.each(commands, (command) => {
      if (command.accelerator)
        localShortcut.register(
          bwindow,
          command.accelerator,
          () => !inInput && inWrapper && document.hasFocus() && command.click()
        )
    })

    function handleUpdate() {
      const template = [
        ...(isMac ? [{ role: 'appMenu' }] : []),
        {
          label: 'File',
          submenu: [
            {
              label: 'New Project',
              ...commands.newProject,
            },
            {
              label: 'Open Project',
              ...commands.openProject,
            },
            { type: 'separator' },
            {
              label: 'Save Project',
              ...commands.saveProject,
            },
            {
              label: 'Save Project As',
              click: saveAs,
            },
            { type: 'separator' },
            {
              label: 'Export Project',
              ...commands.exportProject,
            },
            {
              label: 'Export Scene',
              ...commands.exportScene,
            },
            {
              label: 'Export Track',
              ...commands.exportTrack,
            },
            { type: 'separator' },
            {
              label: 'Import',
              ...commands.import,
            },
            { type: 'separator' },
            {
              label: 'Record',
              ...commands.record,
            },
            {
              label: 'Record From Track',
              ...commands.recordFromTrack,
            },
            { type: 'separator' },
            {
              label: 'Find Missing Media',
              ...commands.findMissing,
            },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
        {
          label: 'Edit',
          submenu: [
            { label: 'Undo', ...commands.undo },
            { label: 'Redo', ...commands.redo },
            { type: 'separator' },
            { role: 'copy' },
            { role: 'paste' },
            { type: 'separator' },
            {
              label: menuState.editing ? 'Save Track' : 'Edit Track',
              enabled: !inInput,
              ...commands.editTrack,
            },
            {
              label: 'Infer Divisions',
              enabled: !inInput && menuState.editing,
              ...commands.inferDivisions,
            },
            {
              label: 'Infer Left',
              enabled: !inInput && menuState.editing,
              ...commands.inferLeft,
            },
            {
              label: 'Infer Right',
              enabled: !inInput && menuState.editing,
              ...commands.inferRight,
            },
            {
              label: 'Clear Divisions',
              enabled: !inInput && menuState.editing,
              ...commands.clearDivisions,
            },
          ],
        },
        {
          label: 'Scene',
          submenu: [
            {
              label: 'Reset Scene',
              ...commands.resetScene,
            },
            {
              label: 'Pause All',
              ...commands.pauseAll,
            },
            {
              label: 'Stop All',
              enabled: menuState.playing,
              ...commands.stopAll,
            },
            { type: 'separator' },
            {
              label: 'New Scene After',
              ...commands.newScene,
            },
            {
              label: 'New Scene Before',
              ...commands.newSceneBefore,
            },
            { type: 'separator' },
            {
              label: 'Import Scene Next',
              ...commands.importSceneNext,
            },
            {
              label: 'Import Scene to End',
              ...commands.importSceneEnd,
            },
            { type: 'separator' },
            {
              label: 'Previous Track',
              ...commands.prevTrack,
            },
            {
              label: 'Next Track',
              ...commands.nextTrack,
            },
            {
              label: 'Skip Next',
              enabled: menuState.sceneIndex < menuState.scenesCount - 2,
              ...commands.skipNextScene,
            },
            {
              label: 'Delete Next',
              enabled: menuState.sceneIndex < menuState.scenesCount - 1,
              ...commands.delNextScene,
            },
            {
              label: 'Delete Following',
              enabled: menuState.sceneIndex < menuState.scenesCount - 1,
              ...commands.delFollowing,
            },
            { type: 'separator' },
            {
              label: 'Delete Scene',
              ...commands.delScene,
            },
          ],
        },
        {
          label: 'Track',
          enabled: !!menuState.selectedTrackId,
          submenu: [
            {
              label: 'Duplicate Track',
              ...commands.duplicateTrack,
            },
            { type: 'separator' },
            {
              label: menuState.trackPlaying && menuState.playing ? 'Stop' : 'Play',
              enabled: !inInput,
              ...commands.playPauseTrack,
            },
            {
              label: 'Play To End',
              enabled: !inInput,
              ...commands.playToEndTrack,
            },
            {
              label: 'Mute',
              enabled: !inInput,
              ...commands.muteTrack,
            },
            {
              label: 'Solo',
              enabled: !inInput,
              ...commands.soloTrack,
            },
            { type: 'separator' },
            {
              label: 'Sync On',
              enabled: !inInput,
              ...commands.syncOnTrack,
            },
            {
              label: 'Sync Off',
              enabled: !inInput,
              ...commands.syncOffTrack,
            },
            {
              label: 'Lock Sync',
              ...commands.syncLockTrack,
            },
            { type: 'separator' },
            {
              label: 'Next Cue',
              enabled: !inInput,
              ...commands.nextCue,
            },
            {
              label: 'Previous Cue',
              enabled: !inInput,
              ...commands.prevCue,
            },
            {
              label: 'Create Cue',
              ...commands.newCue,
            },
            { type: 'separator' },
            {
              label: 'Delete Track',
              ...commands.delTrack,
            },
          ],
        },
        {
          label: 'Controls',
          submenu: [
            {
              label: 'Add Control',
              ...commands.addControl,
            },
            {
              label: 'Set Midi',
              ...commands.setMidi,
            },
            { type: 'separator' },
            {
              label: 'Clear Controls',
              ...commands.clearControls,
            },
            {
              label: 'Disable Controls',
              ...commands.disableControls,
            },
            { type: 'separator' },
            {
              label: 'Open Binding Confing',
              ...commands.openBindings,
            },
            {
              label: 'Save Binding Config',
              ...commands.saveBindings,
            },
            {
              label: 'Clear Bindings',
              ...commands.clearBindings,
            },
          ],
        },
        {
          label: 'Output',
          submenu: menuState.output.devices.map((device) => {
            return {
              label: device.name,
              type: 'checkbox',
              checked: device.index === menuState.output.current,
              click: () =>
                store.dispatch(
                  Actions.setOutputs({
                    current: device.index,
                  })
                ),
            }
          }),
        },
        {
          label: 'View',
          submenu: [
            {
              label: 'Track Scroll',
              type: 'checkbox',
              checked: menuState.trackScroll,
              ...commands.trackScroll,
            },
            {
              label: 'Dark Mode',
              type: 'checkbox',
              checked: menuState.darkMode,
              ...commands.darkMode,
            },
            {
              label: 'Update Rate',
              submenu: [
                {
                  label: 'High',
                  type: 'checkbox',
                  checked: menuState.updateRate === 'high',
                  ...commands.highRate,
                },
                {
                  label: 'Medium',
                  type: 'checkbox',
                  checked: menuState.updateRate === 'medium',
                  ...commands.medRate,
                },
                {
                  label: 'Low',
                  type: 'checkbox',
                  checked: menuState.updateRate === 'low',
                  ...commands.lowRate,
                },
              ],
            },
            { type: 'separator' },
            { role: 'reload', accelerator: 'Alt+R' },
            { role: 'toggledevtools' },
            { label: 'Escape', ...commands.exitModal },
            { type: 'separator' },
            {
              label: 'Reset Zoom',
              ...commands.resetZoom,
            },
            {
              label: 'Zoom In',
              ...commands.zoomIn,
            },
            {
              label: 'Zoom Out',
              ...commands.zoomOut,
            },
            { type: 'separator' },
            { role: 'togglefullscreen' },
          ],
        },
        {
          label: 'Window',
          submenu: [
            { role: 'minimize' },
            { role: 'zoom' },
            ...(isMac
              ? [
                  { type: 'separator' },
                  { role: 'front' },
                  { type: 'separator' },
                  { role: 'window' },
                ]
              : [{ role: 'close' }]),
          ],
        },
      ]

      const menu = Menu.buildFromTemplate(template as any)
      Menu.setApplicationMenu(menu)
    }

    store.subscribe(() => {
      const state = store.getState(),
        newMenuState = Selectors.getMenuState(state)
      if (menuState !== newMenuState) {
        menuState = newMenuState
        handleUpdate()
      }
    })
    handleUpdate()

    function saveAs() {
      const path = dialog.showSaveDialog({
        title: 'Save Project',
        nameFieldLabel: 'Project Name',
        defaultPath: getPath('projects/untitled'),
        buttonLabel: 'Save As',
      })
      if (path) saveProject(path + '.syp', store)
    }
  }, [])

  return null
}
