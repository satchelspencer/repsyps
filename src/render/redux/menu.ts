import electron from 'electron'
import { Store } from 'redux'

import * as Types from 'render/util/types'
import * as Actions from './actions'
import { getPath } from 'render/loading/app-paths'
import { loadBindings, saveBindings } from 'render/loading/bindings'
import { loadProject, saveProject } from 'render/loading/project'

const { Menu, dialog } = electron.remote,
  isMac = process.platform === 'darwin'

export default function init(store: Store<Types.State>) {
  function saveAs() {
    const path = dialog.showSaveDialog({
      title: 'Save Project',
      defaultPath: getPath('projects/untitled'),
    })
    if (path) saveProject(path + '.rproj', store)
  }
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
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: 'Speech',
                submenu: [{ role: 'startspeaking' }, { role: 'stopspeaking' }],
              },
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }]),
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forcereload' },
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
}
