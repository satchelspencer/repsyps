import electron from 'electron'
import { Store } from 'redux'

import * as Types from 'render/util/types'
import * as Actions from './actions'
import * as Selectors from './selectors'
import { getPath } from 'render/loading/app-paths'
import { loadBindings, saveBindings } from 'render/loading/bindings'
import { loadProject, saveProject } from 'render/loading/project'

const { Menu, dialog, BrowserWindow } = electron.remote,
  isMac = process.platform === 'darwin'

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
              label: 'New',
              accelerator: 'CmdOrCtrl+N',
              click: () => {
                store.dispatch(Actions.reset({}))
              },
            },
            {
              label: 'Open',
              accelerator: 'CmdOrCtrl+O',
              click: () => {
                const path = dialog.showOpenDialog({
                  defaultPath: getPath('projects'),
                  filters: [{ name: 'repsyps project', extensions: ['rproj'] }],
                })
                if (path && path[0]) loadProject(path[0], store)
              },
            },
            {
              label: 'Save',
              accelerator: 'CmdOrCtrl+S',
              click: () => {
                const savedPath = store.getState().save.path
                if (savedPath) saveProject(savedPath, store)
                else saveAs()
              },
            },
            {
              label: 'Save As',
              accelerator: 'CmdOrCtrl+Shift+S',
              click: saveAs,
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
                  paths.forEach(path => {
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
            {
              label: 'Open Bindings',
              click: () => {
                const path = dialog.showOpenDialog({
                  defaultPath: getPath('bindings'),
                  filters: [{ name: 'repsyps binding', extensions: ['rbind'] }],
                })
                if (path && path[0]) loadBindings(path[0], store)
              },
            },
            {
              label: 'Save Bindings',
              click: () => {
                const path = dialog.showSaveDialog({
                  title: 'Save Contol Bindings',
                  defaultPath: getPath('bindings/untitled'),
                })
                if (path) saveBindings(path + '.rbind', store)
              },
            },
            { type: 'separator' },
            isMac ? { role: 'close' } : { role: 'quit' },
          ],
        },
        {
          label: 'Edit',
          submenu: [{ role: 'undo' }, { role: 'redo' }],
        },
        {
          label: 'Scene',
          submenu: [
            {
              label: 'Reset Scene',
              accelerator: 'CmdOrCtrl+R',
              click: () => store.dispatch(Actions.zeroInitValues({})),
            },
            { type: 'separator' },
            {
              label: 'New Scene After',
              //accelerator: 'CmdOrCtrl+N',
              click: () => {
                const sceneIndex = store.getState().live.sceneIndex
                store.dispatch(Actions.selectTrackExclusive(null))
                store.dispatch(Actions.createScene(sceneIndex + 1))
              },
            },
            {
              label: 'New Scene Before',
              //accelerator: 'CmdOrCtrl+Shift+N',
              click: () => {
                const sceneIndex = store.getState().live.sceneIndex
                store.dispatch(Actions.selectTrackExclusive(null))
                store.dispatch(Actions.createScene(sceneIndex))
              },
            },
            { type: 'separator' },
            {
              label: 'Delete Scene',
              click: () => {
                const sceneIndex = store.getState().live.sceneIndex
                store.dispatch(Actions.deleteScene(sceneIndex))
              },
            },
          ],
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
            { type: 'separator' },
            { role: 'reload', accelerator: 'Alt+R' },
            { role: 'toggledevtools' },
            { type: 'separator' },
            { role: 'resetzoom' },
            { role: 'zoomin' },
            { role: 'zoomout' },
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
    if (path) saveProject(path + '.rproj', store)
  }
}
