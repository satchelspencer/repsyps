import { app, dialog, ipcMain } from 'electron'
import * as path from 'path'
import { format as formatUrl } from 'url'
import contextMenu from 'electron-context-menu'
import * as imp from 'electron-devtools-installer'
import * as Splashscreen from '@trodi/electron-splashscreen'

import audio from 'render/util/audio'

const isDevelopment = process.env.NODE_ENV !== 'production'
let mainWindow: any = null

if (isDevelopment)
  contextMenu({
    showInspectElement: true,
  })

dialog.showErrorBox = (title, content) => console.log('err', title, content)

function createMainWindow() {
  const mainOpts: Electron.BrowserWindowConstructorOptions = {
    width: 1050,
    height: 700,
    titleBarStyle: 'hiddenInset',
    webPreferences: { nodeIntegration: true },
  }

  const window = Splashscreen.initSplashScreen({
      windowOpts: mainOpts,
      templateUrl: !isDevelopment
        ? path.join(__dirname, 'splash.html')
        : path.resolve(__dirname, '../conf/build/splash.html'),
      splashScreenOpts: {
        width: 500,
        height: 500,
        transparent: true,
      },
    }),
    windowUrl = isDevelopment
      ? `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`
      : formatUrl({
          pathname: path.join(__dirname, 'index.html'),
          protocol: 'file',
          slashes: true,
        })

  if (isDevelopment) window.webContents.openDevTools({ mode: 'detach' })
  window.webContents.setZoomFactor(1)

  window.loadURL(windowUrl)
  // init things
  window.on('closed', () => {
    mainWindow = null
  })

  return window
}

const hasLock = process.platform === 'darwin' || app.requestSingleInstanceLock()

if (!hasLock) app.quit()
else {
  /* file association opening */
  let fileQueue: string[] = [],
    renderer: Electron.WebContents = null

  ipcMain.on('connect', (e: Electron.IpcMessageEvent) => {
    console.log('ipc connected')
    mainWindow.webContents.setZoomFactor(1)
    renderer = e.sender
    fileQueue.forEach((file) => renderer.send('openFile', file))
    fileQueue = []
  })

  app.on('second-instance', (e, cl, dir) => {
    if (cl[1]) {
      if (renderer) renderer.send('openFile', cl[1])
      else fileQueue.push(cl[1])
    }
  })
  app.on('open-file', (e, url) => {
    e.preventDefault()
    if (renderer) renderer.send('openFile', url)
    else fileQueue.push(url)
  })

  app.on('window-all-closed', () => app.quit())

  app.on('activate', () => {
    if (mainWindow === null) mainWindow = createMainWindow()
  })

  // create main BrowserWindow when electron is ready
  app.on('ready', () => {
    mainWindow = createMainWindow()
    mainWindow.webContents.on('did-frame-finish-load', () => {
      imp.default(
        [imp.REACT_DEVELOPER_TOOLS, imp.REDUX_DEVTOOLS],
        process.env.UPDATE_DEVTOOLS === 'true'
      )
    })
  })
}
