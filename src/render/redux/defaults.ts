import * as Types from 'render/util/types'
import { RATE } from 'render/util/audio'

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
    chunkIndex: -1,
    nextAtChunk: false,
    muted: false,
    sourceTracksParams: {},
    unpause: false,
  },
  defaultTrack: Types.Track = {
    visibleSourceTrack: null,
    playback: defaultTrackPlayback,
    nextPlayback: null,
    selected: false,
    editing: true,
    sourceTrackEditing: null,
    cues: [],
    cueIndex: -1,
    nextCueIndex: -1,
    playLock: false,
    lastPeriod: 0,
  },
  defaultBindings: Types.Bindings = {},
  defaultBinding: Types.Binding = {
    type: 'value',
    channel: null,
    note: null,
    function: null,
    twoway: true,
  },
  defaultScene: Types.Scene = {
    controls: {},
    trackIds: [],
  },
  defaultLive: Types.Live = {
    sceneIndex: 0,
    scenes: [defaultScene],
    tracks: {},
    controlValues: {},
    initValues: {},
    bindings: defaultBindings,
    controlPresets: {},
    defaultPresetId: null,
    controlsEnabled: true,
  },
  defaultSource: Types.Source = {
    name: '',
    bounds: [],
    boundsAlpha: 1,
    sourceTracks: {},
  },
  defaultSources: Types.Sources = {},
  defaultTiming: Types.Times = {
    time: 0,
    tracks: {},
    recTime: 0,
  },
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
  },
  defaultRecording: Types.Recording = {
    enabled: false,
    fromTrack: null,
  },
  defaultState: Types.State = {
    save: defaultSave,
    timing: defaultTiming,
    playback: defaultPlayback,
    live: defaultLive,
    sources: defaultSources,
    settings: defaultSettings,
    recording: defaultRecording,
  }
