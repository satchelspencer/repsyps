import { app, BrowserWindow, dialog } from 'electron'
import * as path from 'path'
import { format as formatUrl } from 'url'
import contextMenu from 'electron-context-menu'
import * as imp from 'electron-devtools-installer'

contextMenu({
  showInspectElement: true,
})

const isDevelopment = process.env.NODE_ENV !== 'production'
let mainWindow: any = null

dialog.showErrorBox = (title, content) => console.log('err', title, content)

function createMainWindow() {
  const window = new BrowserWindow({
      width: 1050,
      height: 700,
      titleBarStyle: 'hiddenInset',
      webPreferences: { nodeIntegration: true },
    }),
    windowUrl = isDevelopment
      ? `http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`
      : formatUrl({
          pathname: path.join(__dirname, 'index.html'),
          protocol: 'file',
          slashes: true,
        })

  if (isDevelopment) window.webContents.openDevTools({ mode: 'detach' })

  window.loadURL(windowUrl)
  // init things
  window.on('closed', () => {
    mainWindow = null
    //destroy things here
  })

  return window
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) mainWindow = createMainWindow()
})

// create main BrowserWindow when electron is ready
app.on('ready', () => {
  mainWindow = createMainWindow()
  imp.default(
    [imp.REACT_DEVELOPER_TOOLS, imp.REDUX_DEVTOOLS],
    process.env.UPDATE_DEVTOOLS === 'true'
  )
})
