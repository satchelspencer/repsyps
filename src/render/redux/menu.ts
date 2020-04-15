import electron from 'electron'
import { Store } from 'redux'

import * as Types from 'render/util/types'
import * as Actions from './actions'
import * as Selectors from './selectors'

import { getPath, getAppPath } from 'render/loading/app-paths'
import { loadBindings, saveBindings } from 'render/loading/bindings'
import {
  loadProject,
  saveProject,
  exportProject,
  loadProjectScenes,
} from 'render/loading/project'
import { undo, redo } from './history'
import audio from 'render/util/audio'

const { Menu, dialog } = electron.remote,
  isMac = process.platform === 'darwin'

const noInput = (handler: () => void) => {
  return () => {
    if (document.activeElement.nodeName !== 'INPUT') handler()
  }
}

export default function init(store: Store<Types.State>) {
  let lastMenuState = null

  function handleUpdate() {
    const state = store.getState(),
      menuState = Selectors.getMenuState(state)
    if (menuState !== lastMenuState) {
      const template = [
        ...(isMac ? [{ role: 'appMenu' }] : []),
        {
          label: 'File',
          submenu: [
            {
              label: 'New Project',
              accelerator: 'CmdOrCtrl+N',
              click: () => {
                store.dispatch(Actions.reset())
              },
            },
            {
              label: 'Open Project',
              accelerator: 'CmdOrCtrl+O',
              click: () => {
                const path = dialog.showOpenDialog({
                  defaultPath: getPath('projects'),
                  filters: [{ name: 'repsyps project', extensions: ['syp'] }],
                })
                if (path && path[0]) loadProject(path[0], store)
              },
            },
            { type: 'separator' },
            {
              label: 'Save Project',
              accelerator: 'CmdOrCtrl+S',
              click: () => {
                const savedPath = store.getState().save.path
                if (savedPath) saveProject(savedPath, store)
                else saveAs()
              },
            },
            {
              label: 'Save Project As',
              accelerator: 'CmdOrCtrl+Shift+S',
              click: saveAs,
            },
            {
              label: 'Export Project',
              click: () => {
                const path = dialog.showSaveDialog({
                  title: 'Export Project',
                  defaultPath: getPath('projects'),
                })
                if (path) exportProject(path, store)
              },
            },
            { type: 'separator' },
            {
              label: 'Import',
              accelerator: 'CmdOrCtrl+I',
              click: () => {
                const paths = dialog.showOpenDialog({
                  properties: ['openFile'],
                })
                if (paths)
                  paths.forEach((path) => {
                    store.dispatch(Actions.addTrackAndSource(path))
                  })
              },
            },
            { type: 'separator' },
            {
              label: 'New Recording',
              accelerator: 'CmdOrCtrl+Shift+R',
              click: () => {
                store.dispatch(Actions.setRecording({ enabled: true, fromTrack: null }))
              },
            },
            {
              label: 'New Recording From Track',
              click: () => {
                store.dispatch(
                  Actions.setRecording({
                    enabled: true,
                    fromTrack: Selectors.getSelectedTrackId(store.getState()),
                  })
                )
              },
            },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
        {
          label: 'Edit',
          submenu: [
            { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: undo },
            { label: 'Redo', accelerator: 'CmdOrCtrl+Shift+Z', click: redo },
            { type: 'separator' },
            { role: 'copy' },
            { role: 'paste' },
          ],
        },
        {
          label: 'Scene',
          submenu: [
            {
              label: 'Reset Scene',
              accelerator: 'CmdOrCtrl+R',
              click: () => store.dispatch(Actions.zeroInitValues()),
            },
            { type: 'separator' },
            {
              label: 'New Scene After',
              accelerator: 'CmdOrCtrl+Shift+N',
              click: () => {
                store.dispatch(Actions.selectTrackExclusive(null))
                store.dispatch(Actions.createScene(menuState.sceneIndex + 1))
              },
            },
            {
              label: 'New Scene Before',
              accelerator: 'CmdOrCtrl+Alt+N',
              click: () => {
                store.dispatch(Actions.selectTrackExclusive(null))
                store.dispatch(Actions.createScene(menuState.sceneIndex))
              },
            },
            { type: 'separator' },
            {
              label: 'Import Scene Next',
              accelerator: 'CmdOrCtrl+Shift+I',
              click: () => {
                const path = dialog.showOpenDialog({
                  defaultPath: getPath('projects'),
                  filters: [{ name: 'repsyps project', extensions: ['syp'] }],
                })
                if (path && path[0])
                  loadProjectScenes(path[0], menuState.sceneIndex + 1, store)
              },
            },
            {
              label: 'Import Scene to End',
              accelerator: 'CmdOrCtrl+Alt+I',
              click: () => {
                const path = dialog.showOpenDialog({
                  defaultPath: getPath('projects'),
                  filters: [{ name: 'repsyps project', extensions: ['syp'] }],
                })
                if (path && path[0])
                  loadProjectScenes(path[0], menuState.scenesCount, store)
              },
            },
            { type: 'separator' },
            {
              label: 'Skip Next',
              accelerator: 'CmdOrCtrl+Shift+Right',
              enabled: menuState.sceneIndex < menuState.scenesCount - 2,
              click: () => {
                store.dispatch(Actions.cycleScenes(menuState.sceneIndex + 1))
              },
            },
            {
              label: 'Delete Next',
              accelerator: 'CmdOrCtrl+Alt+Right',
              enabled: menuState.sceneIndex < menuState.scenesCount - 1,
              click: () => {
                store.dispatch(Actions.deleteScene(menuState.sceneIndex + 1))
              },
            },
            {
              label: 'Delete Following',
              accelerator: 'CmdOrCtrl+Alt+Shift+Right',
              enabled: menuState.sceneIndex < menuState.scenesCount - 1,
              click: () => store.dispatch(Actions.deleteAfter(menuState.sceneIndex)),
            },
            { type: 'separator' },
            {
              label: 'Delete Scene',
              accelerator: 'CmdOrCtrl+Shift+Backspace',
              click: () => {
                store.dispatch(Actions.deleteScene(menuState.sceneIndex))
              },
            },
          ],
        },
        {
          label: 'Track',
          submenu: [
            {
              label: 'Export Track',
              click: () => {
                const selectedTrackId = Selectors.getSelectedTrackId(store.getState())
                if (!selectedTrackId) return
                const path = dialog.showSaveDialog({
                  title: 'Export Track',
                  defaultPath: getAppPath('documents'),
                })
                if (path) audio.exportSource(path + '.m4a', selectedTrackId)
              },
            },
            { type: 'separator' },
            {
              label: 'Delete Track',
              accelerator: 'CmdOrCtrl+Backspace',
              click: () => {
                const selectedTrackId = Selectors.getSelectedTrackId(store.getState())
                if (selectedTrackId) store.dispatch(Actions.rmTrack(selectedTrackId))
              },
            },
          ],
        },
        {
          label: 'Controls',
          submenu: [
            {
              label: 'Clear Controls',
              click: noInput(() => {
                store.dispatch(Actions.clearControls())
              }),
            },
            { type: 'separator' },
            {
              label: 'Open Binding Confing',
              click: () => {
                const path = dialog.showOpenDialog({
                  defaultPath: getPath('bindings'),
                  filters: [{ name: 'repsyps binding', extensions: ['rbind'] }],
                })
                if (path && path[0]) loadBindings(path[0], store)
              },
            },
            {
              label: 'Save Binding Config',
              click: () => {
                const path = dialog.showSaveDialog({
                  title: 'Save Contol Bindings',
                  defaultPath: getPath('bindings/untitled'),
                })
                if (path) saveBindings(path + '.rbind', store)
              },
            },
            {
              label: 'Clear Bindings',
              click: noInput(() => {
                store.dispatch(Actions.resetBindings())
              }),
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
              accelerator: 'CmdOrCtrl+Shift+T',
              click: () => {
                const currentScroll = store.getState().settings.trackScroll
                store.dispatch(
                  Actions.setSettings({
                    trackScroll: !currentScroll,
                  })
                )
              },
            },
            {
              label: 'Dark Mode',
              type: 'checkbox',
              accelerator: 'CmdOrCtrl+Shift+D',
              checked: menuState.darkMode,
              click: () => {
                const currentDark = store.getState().settings.darkMode
                store.dispatch(
                  Actions.setSettings({
                    darkMode: !currentDark,
                  })
                )
              },
            },
            {
              label: 'Update Rate',
              submenu: [
                {
                  label: 'High',
                  type: 'checkbox',
                  checked: menuState.updateRate === 'high',
                  click: () =>
                    store.dispatch(Actions.setSettings({ updateRate: 'high' })),
                },
                {
                  label: 'Medium',
                  type: 'checkbox',
                  checked: menuState.updateRate === 'medium',
                  click: () =>
                    store.dispatch(Actions.setSettings({ updateRate: 'medium' })),
                },
                {
                  label: 'Low',
                  type: 'checkbox',
                  checked: menuState.updateRate === 'low',
                  click: () => store.dispatch(Actions.setSettings({ updateRate: 'low' })),
                },
              ],
            },
            { type: 'separator' },
            { role: 'reload', accelerator: 'Alt+R' },
            { role: 'toggledevtools' },
            // { type: 'separator' },
            // { role: 'resetzoom' },
            // { role: 'zoomin' },
            // { role: 'zoomout' },
            { type: 'separator' },
            {
              label: 'Reset Zoom',
              accelerator: 'CmdOrCtrl+0',
              click: () => {
                store.dispatch(
                  Actions.setSettings({
                    size: 11,
                  })
                )
              },
            },
            {
              label: 'Zoom In',
              accelerator: 'CmdOrCtrl+Shift+Plus',
              click: () => {
                const currentSize = store.getState().settings.size
                store.dispatch(
                  Actions.setSettings({
                    size: currentSize + 1,
                  })
                )
              },
            },
            {
              label: 'Zoom Out',
              accelerator: 'CmdOrCtrl+Shift+-',
              click: () => {
                const currentSize = store.getState().settings.size
                store.dispatch(
                  Actions.setSettings({
                    size: currentSize - 1,
                  })
                )
              },
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
      lastMenuState = menuState
    }
  }

  store.subscribe(handleUpdate)
  handleUpdate()

  function saveAs() {
    const path = dialog.showSaveDialog({
      title: 'Save Project',
      defaultPath: getPath('projects/untitled'),
    })
    if (path) saveProject(path + '.syp', store)
  }
}
