import { useEffect } from 'react'
import electron, { clipboard } from 'electron'
import pathUtils from 'path'
import _ from 'lodash'
import localShortcut from 'electron-localshortcut'
import ytdl from 'ytdl-core'
import filenamify from 'filenamify'
import fs from 'fs'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import { defaultState } from 'render/redux/defaults'
import useAddSource from 'render/util/add-source'
import uid from 'render/util/uid'

import { useSelection } from 'render/components/selection'
import { useDispatch, useStore } from 'render/redux/react'

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
import useResetScene from 'render/util/reset-scene'

const { Menu, dialog, getCurrentWindow, app } = electron.remote,
  isMac = process.platform === 'darwin'

export default function init() {
  const store = useStore(),
    dispatch = useDispatch()

  const { getSelection } = useSelection<Types.Control>('control'),
    addSource = useAddSource(),
    resetScene = useResetScene()

  useEffect(() => {
    let menuState: Types.MenuState = Selectors.getMenuState(defaultState),
      inInput = false,
      inDialog = 0,
      inWrapper = 0

    const showOpenDialog = (options: electron.OpenDialogOptions) => {
      const path = dialog.showOpenDialogSync(options)
      inDialog = new Date().getTime()
      return path
    }

    const showSaveDialog = (options: electron.SaveDialogOptions) => {
      const path = dialog.showSaveDialogSync(options)
      inDialog = new Date().getTime()
      return path
    }

    document.addEventListener('focusin', () => {
      const nodeName = document.activeElement?.nodeName,
        newInInput = nodeName === 'INPUT'

      if (inInput !== newInInput) {
        inInput = newInInput
        handleUpdate()
      }
    })

    const commands: {
        [name: string]: {
          click: () => any
          accelerator?: string
          noMenu?: boolean
        }
      } = {
        about: {
          click: () => dispatch(Actions.setModalRoute('about')),
        },
        changelog: {
          click: () => dispatch(Actions.setModalRoute('changelog')),
        },
        update: {
          click: () => dispatch(Actions.setModalRoute('update')),
        },
        quit: {
          click: () => app.quit(),
          accelerator: 'CmdOrCtrl+Q',
        },
        newProject: {
          click: () => dispatch(Actions.reset()),
          accelerator: 'CmdOrCtrl+Shift+N',
        },
        openProject: {
          click: () => {
            const path = showOpenDialog({
              defaultPath: getPath('library'),
              buttonLabel: 'Open Project',
              filters: [
                {
                  name: 'Repsyps Project',
                  extensions: ['syp'],
                },
              ],
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
            const path = showSaveDialog({
              nameFieldLabel: 'Project Name',
              title: 'Export Project',
              defaultPath: getPath('library'),
              buttonLabel: 'Export Project',
            })
            if (path) exportProject(path, store)
          },
          accelerator: 'CmdOrCtrl+E',
        },
        exportScene: {
          click: () => {
            const path = showSaveDialog({
              nameFieldLabel: 'Project Name',
              title: 'Save Project',
              defaultPath: getPath(`library/${getDefaultSaveName(menuState.sceneIndex)}`),
              buttonLabel: 'Export Scene',
              filters: [
                {
                  name: 'Repsyps Project',
                  extensions: ['syp'],
                },
              ],
            })
            if (path) exportCurrentScene(path, store)
          },
          accelerator: 'CmdOrCtrl+Shift+E',
        },
        exportTrack: {
          click: () => {
            const state = store.getState(),
              selectedTrackId = Selectors.getSelectedTrackId(state),
              name = Selectors.getSourceByTrackId(state, selectedTrackId)?.name ?? '??'

            if (!selectedTrackId) return
            const path = showSaveDialog({
              nameFieldLabel: 'Track Name',
              defaultPath:
                getAppPath('documents') +
                pathUtils.basename(name, pathUtils.extname(name)),
              buttonLabel: 'Export Track',
              filters: [
                {
                  name: 'AAC Audio',
                  extensions: ['m4a'],
                },
              ],
            })
            if (path) audio.exportSource(path, selectedTrackId)
          },
          accelerator: 'CmdOrCtrl+Alt+E',
        },
        import: {
          click: () => {
            const paths = showOpenDialog({
              properties: ['openFile'],
              message: 'Import Audio or Scenes',
              buttonLabel: 'Import',
            })
            if (paths)
              paths.forEach((path) => {
                if (pathUtils.extname(path) === '.syp') {
                  loadProjectScenes(path, store, false, menuState.sceneIndex + 1)
                } else if (pathUtils.extname(path) === '.rbind')
                  loadBindings(path[0], store)
                else dispatch(Actions.addTrackAndSource(path))
              })
          },
          accelerator: 'CmdOrCtrl+I',
        },
        download: {
          click: () => {
            const url = clipboard.readText()
            if (ytdl.validateURL(url)) {
              ytdl.getBasicInfo(url, (e, info) => {
                if (e) console.log('dl info err', e)
                else {
                  const outPath = pathUtils.join(
                    getPath('downloads'),
                    filenamify(info.title) + '.mp4'
                  )
                  ytdl(url, {
                    filter: (format) => format.container === 'mp4',
                  })
                    .pipe(fs.createWriteStream(outPath))
                    .on('error', (e) => console.log('dl err', e))
                    .on('finish', (e) => {
                      if (!e) dispatch(Actions.addTrackAndSource(outPath))
                    })
                }
              })
            }
          },
          noMenu: true,
          accelerator: 'CmdOrCtrl+L',
        },
        record: {
          click: () => dispatch(Actions.setRecording({ enabled: true, fromTrack: null })),
          accelerator: 'CmdOrCtrl+Shift+R',
        },
        recordFromTrack: {
          click: () => {
            dispatch(
              Actions.setRecording({
                enabled: true,
                fromTrack: Selectors.getSelectedTrackId(store.getState()),
              })
            )
          },
          accelerator: 'CmdOrCtrl+Alt+R',
        },
        findMissing: {
          click: () => dispatch(Actions.setModalRoute('relink')),
          accelerator: 'CmdOrCtrl+F',
        },
        openLibrary: {
          click: () => {
            const path = showOpenDialog({
              defaultPath: getPath('/'),
              buttonLabel: 'Open Library',
              properties: ['openDirectory'],
            })
            if (path && path[0]) dispatch(Actions.setLibraryState({ root: path[0] }))
          },
          accelerator: 'CmdOrCtrl+Shift+K',
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
            dispatch(
              Actions.editTrack({
                trackId: menuState.selectedTrackId,
                edit: !menuState.editing,
              })
            ),
          accelerator: 'CmdOrCtrl+E',
        },
        inferDivisions: {
          click: () =>
            menuState.sourceId &&
            dispatch(
              Actions.inferBounds({
                sourceId: menuState.sourceId,
                direction: 'both',
              })
            ),
          accelerator: '\\',
        },
        inferLeft: {
          click: () =>
            menuState.sourceId &&
            dispatch(
              Actions.inferBounds({
                sourceId: menuState.sourceId,
                direction: 'left',
              })
            ),
          accelerator: '[',
        },
        inferRight: {
          click: () =>
            menuState.sourceId &&
            dispatch(
              Actions.inferBounds({
                sourceId: menuState.sourceId,
                direction: 'right',
              })
            ),
          accelerator: ']',
        },
        clearDivisions: {
          click: () =>
            menuState.sourceId &&
            dispatch(
              Actions.setSourceBounds({
                sourceId: menuState.sourceId,
                bounds: [],
              })
            ),
          accelerator: 'K',
        },
        resetScene: {
          click: resetScene,
          accelerator: 'CmdOrCtrl+R',
        },
        commitScene: {
          click: () => dispatch(Actions.stopPrevTracks()),
          accelerator: 'Enter',
        },
        pauseAll: {
          click: () =>
            dispatch(
              Actions.updatePlayback({
                playing: !menuState.playing,
              })
            ),
          accelerator: 'Shift+Space',
        },
        stopAll: {
          click: () => dispatch(Actions.stopAll()),
          accelerator: 'CmdOrCtrl+Shift+Space',
        },
        newScene: {
          click: () => {
            dispatch(Actions.selectTrackExclusive(null))
            dispatch(Actions.createScene(menuState.sceneIndex + 1))
          },
          accelerator: 'CmdOrCtrl+N',
        },
        newSceneBefore: {
          click: () => {
            dispatch(Actions.selectTrackExclusive(null))
            dispatch(Actions.createScene(menuState.sceneIndex))
          },
          accelerator: 'CmdOrCtrl+Alt+N',
        },
        importSceneTracks: {
          click: () => {
            const path = showOpenDialog({
              defaultPath: getPath('library'),
              filters: [{ name: 'repsyps project', extensions: ['syp'] }],
              buttonLabel: 'Import Before',
            })
            if (path && path[0])
              loadProjectScenes(path[0], store, true, menuState.sceneIndex)
          },
          accelerator: 'CmdOrCtrl+Shift+I',
        },
        importSceneBefore: {
          click: () => {
            const path = showOpenDialog({
              defaultPath: getPath('library'),
              filters: [{ name: 'repsyps project', extensions: ['syp'] }],
              buttonLabel: 'Import Before',
            })
            if (path && path[0])
              loadProjectScenes(path[0], store, false, menuState.sceneIndex)
          },
          accelerator: 'CmdOrCtrl+Alt+I',
        },
        importSceneEnd: {
          click: () => {
            const path = showOpenDialog({
              defaultPath: getPath('library'),
              filters: [{ name: 'repsyps project', extensions: ['syp'] }],
              buttonLabel: 'Import to End',
            })
            if (path && path[0])
              loadProjectScenes(path[0], store, false, menuState.scenesCount)
          },
          accelerator: 'CmdOrCtrl+Shift+Alt+I',
        },
        prevTrack: {
          click: () => dispatch(Actions.stepSelectedTrack(-1)),
          accelerator: 'Up',
        },
        nextTrack: {
          click: () => dispatch(Actions.stepSelectedTrack(1)),
          accelerator: 'Down',
        },
        skipNextScene: {
          click: () => dispatch(Actions.cycleScenes(menuState.sceneIndex + 1)),
          accelerator: 'CmdOrCtrl+Shift+.',
        },
        delNextScene: {
          click: () => dispatch(Actions.deleteScene(menuState.sceneIndex + 1)),
          accelerator: 'CmdOrCtrl+Alt+.',
        },
        delFollowing: {
          click: () => dispatch(Actions.deleteAfter(menuState.sceneIndex)),
          accelerator: 'CmdOrCtrl+Alt+Shift+.',
        },
        delScene: {
          click: () => dispatch(Actions.deleteScene(menuState.sceneIndex)),
          accelerator: 'CmdOrCtrl+Backspace',
        },
        duplicateTrack: {
          click: () => {
            const selectedTrackId = Selectors.getSelectedTrackId(store.getState())
            if (!selectedTrackId) return
            dispatch(Actions.duplicateTrack(selectedTrackId))
          },
          accelerator: 'CmdOrCtrl+D',
        },
        addTrackSource: {
          click: () => addSource(menuState.selectedTrackId),
          accelerator: 'CmdOrCtrl+A',
        },
        newTrack: {
          click: () =>
            dispatch(
              Actions.addTrack({
                trackId: uid(),
                sourceId: null,
                sourceTracksParams: {},
              })
            ),
        },
        playPauseTrack: {
          click: () => dispatch(Actions.playPauseTrack(menuState.selectedTrackId)),
          accelerator: 'Space',
        },
        playToEndTrack: {
          click: () =>
            dispatch(Actions.loopTrack({ trackId: menuState.selectedTrackId, loop: -1 })),
          accelerator: 'E',
        },
        toggleLoopTrack: {
          click: () => dispatch(Actions.toggleTrackLoop(menuState.selectedTrackId)),
          accelerator: 'L',
        },
        muteTrack: {
          click: () =>
            dispatch(Actions.setTrackMuted({ trackId: menuState.selectedTrackId })),
          accelerator: 'M',
        },
        soloTrack: {
          click: () =>
            dispatch(Actions.setTrackSolo({ trackId: menuState.selectedTrackId })),
          accelerator: 'S',
        },
        previewTrack: {
          click: () =>
            menuState.output.preview !== null &&
            dispatch(Actions.togglePreviewTrack(menuState.selectedTrackId)),
          accelerator: 'P',
        },
        clearPreview: {
          click: () =>
            menuState.output.preview !== null && dispatch(Actions.clearPreview()),
          accelerator: 'O',
        },
        syncOnTrack: {
          click: () =>
            dispatch(
              Actions.setTrackSync({ trackId: menuState.selectedTrackId, sync: 'on' })
            ),
          accelerator: 'Tab',
        },
        syncOffTrack: {
          click: () =>
            dispatch(
              Actions.setTrackSync({
                trackId: menuState.selectedTrackId,
                sync: 'off',
              })
            ),
          accelerator: '`',
        },
        syncLockTrack: {
          click: () =>
            dispatch(
              Actions.setTrackSync({
                trackId: menuState.selectedTrackId,
                sync: 'lock',
              })
            ),
          accelerator: 'Alt+Tab',
        },
        nextCue: {
          click: () =>
            dispatch(
              Actions.stepTrackCue({
                trackId: menuState.selectedTrackId,
                cueStep: 1,
              })
            ),
          accelerator: 'Right',
        },
        prevCue: {
          click: () => {
            dispatch(
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
            dispatch(
              Actions.addCue({
                trackId: menuState.selectedTrackId,
                cue: {
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
            if (selectedTrackId) dispatch(Actions.rmTrack(selectedTrackId))
          },
          accelerator: 'Backspace',
        },
        addControl: {
          click: async () => {
            const control = await getSelection()
            if (!control) return
            dispatch(Actions.addControlToGroup({ control }))
          },
          accelerator: 'A',
        },
        addControlInv: {
          click: async () => {
            const control = await getSelection()
            if (!control) return
            dispatch(
              Actions.addControlToGroup({
                control: {
                  ...control,
                  invert: !control.invert,
                },
              })
            )
          },
          accelerator: 'B',
        },
        setMidi: {
          click: () =>
            dispatch(
              Actions.setBinding({
                binding: {
                  waiting: true,
                },
              })
            ),
          accelerator: 'CmdOrCtrl+M',
        },
        removeControl: {
          click: () => dispatch(Actions.deleteControlGroup()),
          accelerator: 'Alt+B',
        },
        clearControls: {
          click: () => dispatch(Actions.clearControls()),
          accelerator: 'Alt+Shift+B',
        },
        disableControls: {
          click: () => dispatch(Actions.setControlsEnabled(false)),
          accelerator: 'CmdOrCtrl+B',
        },
        openBindings: {
          click: () => {
            const path = showOpenDialog({
              defaultPath: getPath('bindings'),
              filters: [{ name: 'repsyps binding', extensions: ['rbind'] }],
              buttonLabel: 'Load Bindings',
            })
            if (path && path[0]) loadBindings(path[0], store)
          },
        },
        saveBindings: {
          click: () => {
            const path = showSaveDialog({
              title: 'Save Contol Bindings',
              nameFieldLabel: 'Config Name',
              defaultPath: getPath('bindings/untitled'),
              buttonLabel: 'Save Bindings',
              filters: [
                {
                  name: 'Repsyps Binding Config',
                  extensions: ['rbind'],
                },
              ],
            })
            if (path) saveBindings(path, store)
          },
        },
        clearBindings: {
          click: () => dispatch(Actions.resetBindings()),
        },
        library: {
          click: () => {
            dispatch(Actions.setSettings({ libOpen: !menuState.settings.libOpen }))
          },
          accelerator: 'CmdOrCtrl+K',
        },
        trackScroll: {
          click: () => {
            const currentScroll = store.getState().settings.trackScroll
            dispatch(
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
            dispatch(
              Actions.setSettings({
                darkMode: !currentDark,
              })
            )
          },
          accelerator: 'CmdOrCtrl+Shift+D',
        },
        snapping: {
          click: () => dispatch(Actions.setSettings({ snap: !menuState.settings.snap })),
          accelerator: 'Alt+S',
        },
        highRate: {
          click: () => dispatch(Actions.setSettings({ updateRate: 'high' })),
        },
        medRate: {
          click: () => dispatch(Actions.setSettings({ updateRate: 'medium' })),
        },
        lowRate: {
          click: () => dispatch(Actions.setSettings({ updateRate: 'low' })),
        },
        resetZoom: {
          click: () =>
            dispatch(
              Actions.setSettings({
                size: 11,
              })
            ),
          accelerator: 'CmdOrCtrl+0',
        },
        zoomIn: {
          click: () => {
            const currentSize = store.getState().settings.size
            dispatch(
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
            dispatch(
              Actions.setSettings({
                size: currentSize - 1,
              })
            )
          },
          accelerator: 'CmdOrCtrl+Shift+-',
        },
        reload: {
          click: () => window.location.reload(),
          accelerator: 'Alt+R',
        },
        exitModal: {
          click: () => dispatch(Actions.setModalRoute(null)),
          accelerator: 'Escape',
        },
        screencast: {
          click: () => {
            const newSettings: Partial<Types.Settings> = {
              screencast: !menuState.settings.screencast,
            }
            if (!menuState.settings.screencast) {
              const win = electron.remote.getCurrentWindow()
              win.setSize(1260 / 1.25, 720 / 1.25, true)
              win.setPosition(0, 0, true)
              newSettings.size = 9
            } else {
              newSettings.size = 11
            }
            dispatch(Actions.setSettings(newSettings))
          },
        },
      },
      isSingleKey = (accelerator: string | undefined | null) => {
        return (
          accelerator &&
          (accelerator.length === 1 ||
            [
              'Escape',
              'Space',
              'Backspace',
              'Up',
              'Down',
              'Left',
              'Right',
              'Enter',
              'Alt+Tab',
              'Tab',
            ].includes(accelerator))
        )
      },
      menuCommands = _.mapValues(commands, (command) => {
        const singleKey = isSingleKey(command.accelerator)
        return {
          ...command,
          click: () => {
            const now = new Date().getTime()
            if (
              now - inDialog > 500 &&
              now - inWrapper > 500 &&
              ((document.hasFocus() && !inInput) || !singleKey)
            ) {
              //console.log('menu', command.accelerator)
              command.click()
            }
          },
        }
      })

    const loops = [1, 2, 4, 8]
    _.range(9).forEach((i) => {
      commands['track' + i] = {
        click: () => dispatch(Actions.selectTrackByIndex(i)),
        accelerator: i + 1 + '',
        noMenu: true,
      }
      if (loops.includes(i))
        commands['loop' + i] = {
          click: () =>
            dispatch(
              Actions.loopTrack({
                trackId: menuState.selectedTrackId,
                loop: i,
              })
            ),
          accelerator: 'CmdOrCtrl+' + i,
          noMenu: true,
        }
    })

    const bwindow = getCurrentWindow()
    _.each(commands, (command) => {
      if (command.accelerator && (isSingleKey(command.accelerator) || command.noMenu))
        localShortcut.register(bwindow, command.accelerator, () => {
          if (!inInput && document.hasFocus()) {
            //console.log('windo', command.accelerator)
            command.click()
            inWrapper = new Date().getTime()
          }
        })
    })

    function handleUpdate() {
      const template = [
        ...(isMac
          ? [
              {
                label: 'repsyps',
                submenu: [
                  { label: 'About Repsyps', ...menuCommands.about },
                  { label: 'Check for Updates...', ...menuCommands.update },
                  { type: 'separator' },
                  { role: 'services' },
                  { type: 'separator' },
                  { role: 'hide' },
                  { role: 'hideothers' },
                  { role: 'unhide' },
                  { type: 'separator' },
                  { role: 'quit' },
                ],
              },
            ]
          : []),
        {
          label: 'File',
          submenu: [
            {
              label: 'New Project',
              ...menuCommands.newProject,
            },
            {
              label: 'Open Project',
              ...menuCommands.openProject,
            },
            { type: 'separator' },
            {
              label: 'Save Project',
              ...menuCommands.saveProject,
            },
            {
              label: 'Save Project As',
              ...menuCommands.saveProjectAs,
            },
            { type: 'separator' },
            {
              label: 'Export Project',
              ...menuCommands.exportProject,
            },
            {
              label: 'Export Scene',
              ...menuCommands.exportScene,
            },
            {
              label: 'Export Track',
              ...menuCommands.exportTrack,
            },
            { type: 'separator' },
            {
              label: 'Import',
              ...menuCommands.import,
            },
            { type: 'separator' },
            {
              label: 'Record',
              ...commands.record,
            },
            {
              label: 'Record From Track',
              ...menuCommands.recordFromTrack,
            },
            { type: 'separator' },
            {
              label: 'Find Missing Media',
              ...menuCommands.findMissing,
            },
            {
              label: 'Open Library',
              ...menuCommands.openLibrary,
            },
            { type: 'separator' },
            { role: 'quit' },
          ],
        },
        {
          label: 'Edit',
          submenu: [
            { label: 'Undo', ...menuCommands.undo },
            { label: 'Redo', ...menuCommands.redo },
            { type: 'separator' },
            { role: 'copy' },
            { role: 'paste' },
            { type: 'separator' },
            {
              label: menuState.editing ? 'Save Track' : 'Edit Track',
              enabled: !inInput,
              ...menuCommands.editTrack,
            },
            {
              label: 'Infer Grid',
              enabled: !inInput && menuState.editing,
              ...menuCommands.inferDivisions,
            },
            {
              label: 'Infer Grid Left',
              enabled: !inInput && menuState.editing,
              ...menuCommands.inferLeft,
            },
            {
              label: 'Infer Grid Right',
              enabled: !inInput && menuState.editing,
              ...menuCommands.inferRight,
            },
            {
              label: 'Clear Grid',
              enabled: !inInput && menuState.editing,
              ...menuCommands.clearDivisions,
            },
          ],
        },
        {
          label: 'Scene',
          submenu: [
            {
              label: 'New Track',
              ...menuCommands.newTrack,
            },
            {
              label: 'Reset Scene',
              ...menuCommands.resetScene,
            },
            {
              label: 'Commit Scene',
              enabled: menuState.sceneIndex > 0,
              ...menuCommands.commitScene,
            },
            {
              label: 'Pause All',
              ...menuCommands.pauseAll,
            },
            {
              label: 'Stop All',
              enabled: menuState.playing,
              ...menuCommands.stopAll,
            },
            { type: 'separator' },
            {
              label: 'New Scene After',
              ...menuCommands.newScene,
            },
            {
              label: 'New Scene Before',
              ...menuCommands.newSceneBefore,
            },
            { type: 'separator' },
            {
              label: 'Import Scene Next',
              ...menuCommands.import,
            },
            {
              label: 'Import Tracks to Scene',
              ...menuCommands.importSceneTracks,
            },
            {
              label: 'Import Scene Before',
              ...menuCommands.importSceneBefore,
            },
            {
              label: 'Import Scene to End',
              ...menuCommands.importSceneEnd,
            },
            { type: 'separator' },
            {
              label: 'Previous Track',
              ...menuCommands.prevTrack,
            },
            {
              label: 'Next Track',
              ...menuCommands.nextTrack,
            },
            {
              label: 'Skip Next',
              enabled: menuState.sceneIndex < menuState.scenesCount - 2,
              ...menuCommands.skipNextScene,
            },
            {
              label: 'Delete Next',
              enabled: menuState.sceneIndex < menuState.scenesCount - 1,
              ...menuCommands.delNextScene,
            },
            {
              label: 'Delete Following',
              enabled: menuState.sceneIndex < menuState.scenesCount - 1,
              ...menuCommands.delFollowing,
            },
            { type: 'separator' },
            {
              label: 'Delete Scene',
              ...menuCommands.delScene,
            },
          ],
        },
        {
          label: 'Track',
          enabled: !!menuState.selectedTrackId,
          submenu: [
            {
              label: menuState.trackPlaying && menuState.playing ? 'Stop' : 'Play',
              enabled: !inInput,
              ...menuCommands.playPauseTrack,
            },
            {
              label: 'Play To End',
              enabled: !inInput,
              ...menuCommands.playToEndTrack,
            },
            {
              label: 'Toggle Loop',
              enabled: !inInput,
              ...menuCommands.toggleLoopTrack,
            },
            {
              label: 'Mute',
              enabled: !inInput,
              ...menuCommands.muteTrack,
            },
            {
              label: 'Solo',
              enabled: !inInput,
              ...menuCommands.soloTrack,
            },
            { type: 'separator' },
            {
              label: 'Toggle Preview',
              enabled: !!menuState.output.preview,
              ...menuCommands.previewTrack,
            },
            {
              label: 'Clear Preview',
              enabled: !!menuState.output.preview,
              ...menuCommands.clearPreview,
            },
            { type: 'separator' },
            {
              label: 'Duplicate Track',
              ...menuCommands.duplicateTrack,
            },
            {
              label: 'Add Track Source',
              ...menuCommands.addTrackSource,
            },
            { type: 'separator' },
            {
              label: 'Sync On',
              enabled: !inInput,
              ...menuCommands.syncOnTrack,
            },
            {
              label: 'Sync Off',
              enabled: !inInput,
              ...menuCommands.syncOffTrack,
            },
            {
              label: 'Lock Sync',
              ...menuCommands.syncLockTrack,
            },
            { type: 'separator' },
            {
              label: 'Next Cue',
              enabled: !inInput,
              ...menuCommands.nextCue,
            },
            {
              label: 'Previous Cue',
              enabled: !inInput,
              ...menuCommands.prevCue,
            },
            {
              label: 'Create Cue',
              ...menuCommands.newCue,
            },
            { type: 'separator' },
            {
              label: 'Delete Track',
              ...menuCommands.delTrack,
            },
          ],
        },
        {
          label: 'Controls',
          submenu: [
            {
              label: 'Add Control',
              enabled: !inInput,
              ...menuCommands.addControl,
            },
            {
              label: 'Add Control Inverted',
              enabled: !inInput,
              ...menuCommands.addControlInv,
            },
            {
              label: 'Set Midi',
              ...menuCommands.setMidi,
            },
            {
              label: 'Remove Control',
              ...menuCommands.removeControl,
            },
            { type: 'separator' },
            {
              label: 'Clear Controls',
              ...menuCommands.clearControls,
            },
            {
              label: 'Disable Controls',
              ...menuCommands.disableControls,
            },
            { type: 'separator' },
            {
              label: 'Open Binding Confing',
              ...menuCommands.openBindings,
            },
            {
              label: 'Save Binding Config',
              ...menuCommands.saveBindings,
            },
            {
              label: 'Clear Bindings',
              ...menuCommands.clearBindings,
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
              click: () => dispatch(Actions.setOutputs({ current: device.index })),
            }
          }),
        },
        {
          label: 'Preview',
          submenu: [
            {
              label: 'No Preview',
              type: 'checkbox',
              checked: menuState.output.preview === null,
              click: () => {
                dispatch(Actions.setOutputs({ preview: null }))
                dispatch(Actions.clearPreview())
              },
            },
            { type: 'separator' },
            ...menuState.output.devices.map((device) => {
              return {
                label: device.name,
                type: 'checkbox',
                checked: device.index === menuState.output.preview,
                click: () => dispatch(Actions.setOutputs({ preview: device.index })),
              }
            }),
          ],
        },
        {
          label: 'View',
          submenu: [
            {
              label: 'Track Scroll',
              type: 'checkbox',
              checked: menuState.settings.trackScroll,
              ...menuCommands.trackScroll,
            },
            {
              label: 'Dark Mode',
              type: 'checkbox',
              checked: menuState.settings.darkMode,
              ...menuCommands.darkMode,
            },
            {
              label: 'Snapping',
              type: 'checkbox',
              checked: menuState.settings.snap,
              ...menuCommands.snapping,
            },
            {
              label: 'Update Rate',
              submenu: [
                {
                  label: 'High',
                  type: 'checkbox',
                  checked: menuState.settings.updateRate === 'high',
                  ...menuCommands.highRate,
                },
                {
                  label: 'Medium',
                  type: 'checkbox',
                  checked: menuState.settings.updateRate === 'medium',
                  ...menuCommands.medRate,
                },
                {
                  label: 'Low',
                  type: 'checkbox',
                  checked: menuState.settings.updateRate === 'low',
                  ...menuCommands.lowRate,
                },
              ],
            },
            {
              label: menuState.settings.libOpen ? 'Hide Library' : 'Show Library',
              ...menuCommands.library,
            },
            { type: 'separator' },
            { label: 'Reload', ...menuCommands.reload },
            { role: 'toggledevtools' },
            { label: 'Escape', ...menuCommands.exitModal },
            {
              label: menuState.settings.screencast
                ? 'Disable Screencap View'
                : 'Enable Screencap View',
              ...menuCommands.screencast,
            },
            { type: 'separator' },
            {
              label: 'Reset Zoom',
              ...menuCommands.resetZoom,
            },
            {
              label: 'Zoom In',
              ...menuCommands.zoomIn,
            },
            {
              label: 'Zoom Out',
              ...menuCommands.zoomOut,
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
        {
          role: 'help',
          submenu: [
            {
              label: 'View Tutorials',
              click: async () => {
                await electron.shell.openExternal('https://elldev.com/repsyps/intro')
              },
            },
            {
              label: 'Github Repo',
              click: async () => {
                await electron.shell.openExternal(
                  'https://github.com/satchelspencer/repsyps'
                )
              },
            },
            {
              label: 'Report an Issue',
              click: async () => {
                await electron.shell.openExternal(
                  'https://github.com/satchelspencer/repsyps/issues'
                )
              },
            },
            { label: 'Check for Updates...', ...menuCommands.update },
            { label: 'Changelog', ...menuCommands.changelog },
            { label: 'About Repsyps', ...menuCommands.about },
          ],
        },
      ]

      const menu = Menu.buildFromTemplate(template as any)
      Menu.setApplicationMenu(menu)
    }

    function storeCb() {
      const state = store.getState(),
        newMenuState = Selectors.getMenuState(state)
      if (menuState !== newMenuState) {
        menuState = newMenuState
        handleUpdate()
      }
    }
    store.subscribe(storeCb)
    storeCb()

    function getDefaultSaveName(sceneIndex?: number) {
      const state = store.getState()
      if (sceneIndex === undefined) {
        const currentName =
          state.save.path &&
          pathUtils.basename(state.save.path, pathUtils.extname(state.save.path))
        return currentName || 'untitled'
      } else {
        const firstTrack = state.live.scenes[sceneIndex].trackIds[0],
          firstTrackName = Selectors.getSourceByTrackId(state, firstTrack)?.name ?? ''
        return firstTrackName || 'untitled'
      }
    }

    function saveAs() {
      const path = showSaveDialog({
        title: 'Save Project',
        nameFieldLabel: 'Project Name',
        defaultPath: getPath(`library/${getDefaultSaveName()}`),
        buttonLabel: 'Save As',
        filters: [
          {
            name: 'Repsyps Project',
            extensions: ['syp'],
          },
        ],
      })
      if (path) saveProject(path, store)
    }
  }, [])

  return null
}
