import { app, BrowserWindow, dialog } from 'electron'
import * as path from 'path'
import { format as formatUrl } from 'url'
import contextMenu from 'electron-context-menu'
import fs from 'fs'
import wav from 'node-wav'
import * as imp from 'electron-devtools-installer'

import audio from 'lib/audio'

const RATE = 44100

audio.init()

const A = wav.decode(fs.readFileSync('/Users/satchel/Desktop/10. The Mask.wav'))
audio.addSource('mysource', A.channelData)
audio.setTrack('mytrack', {
  sourceId: 'mysource',
  chunks: [34.13 * RATE, 5.41 * RATE, /*23.27 * RATE, 5.41 * RATE*/],
})

const B = wav.decode(fs.readFileSync('/Users/satchel/Desktop/spacey.wav'))
audio.addSource('mysource2', B.channelData)
audio.setTrack('mytrack2', {
  sourceId: 'mysource2',
  chunks: [0.78 * RATE, 5.27 * RATE],
  volume: 1,
})

const C = wav.decode(fs.readFileSync('/Users/satchel/Desktop/de.wav'))
audio.addSource('mysource3', C.channelData)
audio.setTrack('mytrack3', {
  sourceId: 'mysource3',
  chunks: [16.9 * RATE, 4.0 * RATE * 2],
  volume: 1,
  alpha: 1/2
})

const D = wav.decode(fs.readFileSync('/Users/satchel/Desktop/devo.wav'))
audio.addSource('mysource4', D.channelData)
audio.setTrack('mytrack4', {
  sourceId: 'mysource4',
  chunks: [18.32 * RATE, 3.25 * RATE * 2],
  volume: 1,
  alpha: 1/2
})

audio.updatePlayback({
  period: RATE * 5.5,
  volume: 1,
  playing: true
})

audio.start()

let i = 0
setInterval(() => {
  audio.setTrack('mytrack', {
    volume: (Math.sin((i++ / 100))*0.5 + 1) / 2,
  })
  audio.setTrack('mytrack2', {
    volume: (Math.sin((i++ / 100) + Math.PI/2)*0.5 + 1) / 2,
  })
  audio.setTrack('mytrack3', {
    volume: (Math.sin((i++ / 100) + Math.PI)*0.5 + 1) / 2,
  })
  audio.setTrack('mytrack4', {
    volume: (Math.sin((i++ / 100) + Math.PI*1.5)*0.5 + 1) / 2,
  })
  //console.log(audio.getDebug())
}, 100)

contextMenu({
  showInspectElement: true,
})

imp.default(
  [imp.REACT_DEVELOPER_TOOLS, imp.REDUX_DEVTOOLS],
  process.env.UPDATE_DEVTOOLS === 'true'
)

const isDevelopment = process.env.NODE_ENV !== 'production'
let mainWindow: any = null

dialog.showErrorBox = (title, content) => console.log('err', title, content)

function createMainWindow() {
  const window = new BrowserWindow({
      width: 900,
      height: 600,

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
})
