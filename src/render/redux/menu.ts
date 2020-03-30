import electron from 'electron'
import { Store } from 'redux'

import * as Types from 'render/util/types'
import * as Actions from './actions'
import { getPath } from 'render/loading/app-paths'
import { loadBindings, saveBindings } from 'render/loading/bindings'

const { Menu, dialog } = electron.remote,
  isMac = process.platform === 'darwin'

export default function init(store: Store<Types.State>) {
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
        { type: 'separator' },
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
