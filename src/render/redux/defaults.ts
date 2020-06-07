import * as Types from 'render/util/types'
import { RATE } from 'render/util/audio'
import defaultBindingsFile from 'render/loading/default-bindings'
import { getPath } from 'render/loading/app-paths'

export const defaultPlayback: Types.Playback = {
    volume: 1,
    playing: true,
    period: 2.7 * RATE,
  },
  defaultTrackPlayback: Types.TrackPlayback = {
    chunks: [0, 0],
    alpha: 1,
    volume: 1,
    loop: true,
    playing: false,
    aperiodic: true,
    filter: 0.5,
    delay: 22250,
    delayGain: 0,
    chunkIndex: -1,
    nextAtChunk: false,
    muted: false,
    sourceTracksParams: {},
    unpause: false,
    preservePitch: false,
    preview: false,
  },
  defaultTrack: Types.Track = {
    visibleSourceTrack: null,
    playback: defaultTrackPlayback,
    nextPlayback: null,
    selected: false,
    editing: false,
    sourceTrackEditing: null,
    cues: [],
    cueIndex: -1,
    nextCueIndex: -1,
    playLock: true,
    lastPeriod: 0,
  },
  defaultBindings: Types.Bindings = {},
  defaultBinding: Types.Binding = {
    midi: null,
    twoway: false,
    badMidiValue: false,
    lastMidiValue: -1,
    mcp: false,
  },
  defaultScene: Types.Scene = {
    controls: {},
    trackIds: [],
    controlValues: {},
    initValues: {},
  },
  defaultControlPresets: Types.ControlPresets = defaultBindingsFile.state.controlPresets,
  defaultLive: Types.Live = {
    sceneIndex: 0,
    scenes: [defaultScene],
    tracks: {},
    bindings: defaultBindings,
    controlPresets: defaultControlPresets,
    controlsEnabled: true,
    selectedPosition: { x: 0, y: 0 },
    globalControls: {},
  },
  defaultSource: Types.Source = {
    name: '',
    bounds: [],
    boundsAlpha: 1,
    sourceTracks: {},
  },
  defaultSources: Types.Sources = {},
  defaultTrackSourceParams: Types.TrackSourceParams = { volume: 0, offset: 0 },
  defaultControlGroup: Types.ControlGroup = {
    absolute: true,
    position: { x: 0, y: 0 },
    bindingType: 'value',
    controls: [],
  },
  defaultSave: Types.SaveStatus = {
    saved: false,
    path: null,
  },
  defaultSettings: Types.Settings = {
    trackScroll: true,
    darkMode: true,
    size: 11,
    updateRate: 'medium',
    controlsSize: 35,
    sidebarSize: 25.7,
    libSize: 20,
    libOpen: false,
    gridSize: 8,
    snap: true,
    screencast: false,
  },
  defaultRecording: Types.Recording = {
    enabled: false,
    fromTrack: null,
  },
  defaultOutput: Types.OutputState = {
    default: 1,
    current: 1,
    devices: [],
    preview: null,
  },
  defaultLibraryState: Types.LibraryState = {
    scanning: true,
    projects: {},
    root: getPath('library'),
  },
  defaultState: Types.State = {
    save: defaultSave,
    playback: defaultPlayback,
    live: defaultLive,
    sources: defaultSources,
    settings: defaultSettings,
    recording: defaultRecording,
    output: defaultOutput,
    modalRoute: null,
    library: defaultLibraryState,
  }
