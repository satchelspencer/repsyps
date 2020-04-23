import { useEffect } from 'react'
import electron from 'electron'
import pathUtils from 'path'
import _ from 'lodash'
import localShortcut from 'electron-localshortcut'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import { defaultState } from 'render/redux/defaults'
import { resetTiming } from 'render/components/timing'
import useAddSource from 'render/util/add-source'

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
      const path = dialog.showOpenDialog(options)
      inDialog = new Date().getTime()
      return path
    }

    const showSaveDialog = (options: electron.SaveDialogOptions) => {
      const path = dialog.showSaveDialog(options)
      inDialog = new Date().getTime()
      return path
    }

    document.addEventListener('focusin', () => {
      const nodeName = document.activeElement.nodeName,
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
              filters: [
                {
                  name: 'Repsyps Project',
                  extensions: ['syp'],
                },
              ],
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
              name = state.sources[selectedTrackId].name
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
                  loadProjectScenes(path, menuState.sceneIndex + 1, store)
                } else dispatch(Actions.addTrackAndSource(path))
              })
          },
          accelerator: 'CmdOrCtrl+I',
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
          accelerator: 'E',
        },
        inferDivisions: {
          click: () =>
            dispatch(
              Actions.inferBounds({
                sourceId: menuState.selectedTrackId,
                direction: 'both',
              })
            ),
          accelerator: '\\',
        },
        inferLeft: {
          click: () =>
            dispatch(
              Actions.inferBounds({
                sourceId: menuState.selectedTrackId,
                direction: 'left',
              })
            ),
          accelerator: '[',
        },
        inferRight: {
          click: () =>
            dispatch(
              Actions.inferBounds({
                sourceId: menuState.selectedTrackId,
                direction: 'right',
              })
            ),
          accelerator: ']',
        },
        clearDivisions: {
          click: () =>
            dispatch(
              Actions.setSourceBounds({
                sourceId: menuState.selectedTrackId,
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
        importSceneNext: {
          click: () => {
            const path = showOpenDialog({
              defaultPath: getPath('library'),
              filters: [{ name: 'repsyps project', extensions: ['syp'] }],
              buttonLabel: 'Import Next',
            })
            if (path && path[0])
              loadProjectScenes(path[0], menuState.sceneIndex + 1, store)
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
            if (path && path[0]) loadProjectScenes(path[0], menuState.sceneIndex, store)
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
            if (path && path[0]) loadProjectScenes(path[0], menuState.scenesCount, store)
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
        playPauseTrack: {
          click: () => dispatch(Actions.playPauseTrack(menuState.selectedTrackId)),
          accelerator: 'Space',
        },
        playToEndTrack: {
          click: () =>
            dispatch(Actions.loopTrack({ trackId: menuState.selectedTrackId, loop: -1 })),
          accelerator: 'P',
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
          click: () => dispatch(Actions.setControlsEnabled(null)),
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
          click: () => dispatch(Actions.setSettings({ snap: !menuState.snap })),
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
      },
      isSingleKey = (accelerator: string) => {
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
              (document.hasFocus() || !singleKey)
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
        ...(isMac ? [{ role: 'appMenu' }] : []),
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
              label: 'Infer Divisions',
              enabled: !inInput && menuState.editing,
              ...menuCommands.inferDivisions,
            },
            {
              label: 'Infer Left',
              enabled: !inInput && menuState.editing,
              ...menuCommands.inferLeft,
            },
            {
              label: 'Infer Right',
              enabled: !inInput && menuState.editing,
              ...menuCommands.inferRight,
            },
            {
              label: 'Clear Divisions',
              enabled: !inInput && menuState.editing,
              ...menuCommands.clearDivisions,
            },
          ],
        },
        {
          label: 'Scene',
          submenu: [
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
              ...menuCommands.importSceneNext,
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
              ...menuCommands.addControl,
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
              click: () =>
                dispatch(
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
              ...menuCommands.trackScroll,
            },
            {
              label: 'Dark Mode',
              type: 'checkbox',
              checked: menuState.darkMode,
              ...menuCommands.darkMode,
            },
            {
              label: 'Snapping',
              type: 'checkbox',
              checked: menuState.snap,
              ...menuCommands.snapping,
            },
            {
              label: 'Update Rate',
              submenu: [
                {
                  label: 'High',
                  type: 'checkbox',
                  checked: menuState.updateRate === 'high',
                  ...menuCommands.highRate,
                },
                {
                  label: 'Medium',
                  type: 'checkbox',
                  checked: menuState.updateRate === 'medium',
                  ...menuCommands.medRate,
                },
                {
                  label: 'Low',
                  type: 'checkbox',
                  checked: menuState.updateRate === 'low',
                  ...menuCommands.lowRate,
                },
              ],
            },
            { type: 'separator' },
            { label: 'Reload', ...menuCommands.reload },
            { role: 'toggledevtools' },
            { label: 'Escape', ...menuCommands.exitModal },
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

    function getDefaultSaveName(sceneIndex?: number) {
      const state = store.getState()
      if (sceneIndex === undefined) {
        const currentName =
          state.save.path &&
          pathUtils.basename(state.save.path, pathUtils.extname(state.save.path))
        return currentName || 'untitled'
      } else {
        const firstTrack = state.live.scenes[sceneIndex].trackIds[0],
          firstTrackName = firstTrack && state.sources[firstTrack].name
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
