import _ from 'lodash'
import { createSelector, defaultMemoize, createSelectorCreator } from 'reselect'
import pathUtils from 'path'

import * as Types from 'render/util/types'
import mappings from 'render/util/mappings'
import { objShallowEqual } from 'render/util/is-equal'
import { updateSourcesPaths } from 'render/redux/reducers/global'

const createShallowSelector = createSelectorCreator(defaultMemoize, objShallowEqual)

export const getSelectedTrackId = (state: Types.State) =>
  Object.keys(state.live.tracks).filter((tid) => state.live.tracks[tid].selected)[0]

export const getSelectedTrack = createSelector(
  [getSelectedTrackId, (state) => state.live.tracks],
  (trackId, tracks) => {
    return tracks[trackId]
  }
)

export const getLive = (state: Types.State) => state.live

export const getCurrentScene = (state: Types.State) =>
  state.live.scenes[state.live.sceneIndex]

export const getPrevScene = (state: Types.State) =>
  state.live.scenes[state.live.sceneIndex - 1]

export const getNextScene = (state: Types.State) =>
  state.live.scenes[state.live.sceneIndex + 1]

export function getActiveTrackIdsFromLive(live: Types.Live, sceneIndex?: number) {
  if (sceneIndex === undefined) sceneIndex = live.sceneIndex
  const currentScene = live.scenes[sceneIndex],
    prevScene = live.scenes[sceneIndex - 1]

  return currentScene
    ? prevScene
      ? [...prevScene.trackIds, ...currentScene.trackIds]
      : currentScene.trackIds
    : []
}

export function getActiveTrackIds(state: Types.State, sceneIndex?: number): string[] {
  return getActiveTrackIdsFromLive(state.live, sceneIndex)
}

export function getControlsFromSceneIndex(live: Types.Live, sceneIndex: number) {
  return {
    ...((live.scenes[sceneIndex] && live.scenes[sceneIndex].controls) || {}),
    ...live.globalControls,
  }
}

export const getControls = createSelector([getLive], (live) => {
  return getControlsFromSceneIndex(live, live.sceneIndex)
})

export const getPrevControls = createSelector([getLive], (live) => {
  return getControlsFromSceneIndex(live, live.sceneIndex - 1)
})

export const makeGetTrackIndex = () =>
  createSelector(
    [getCurrentScene, getPrevScene, (_, trackId: string) => trackId],
    (scene, prevScene, trackId) => {
      const currentSceneIndex = scene.trackIds.indexOf(trackId)
      return currentSceneIndex === -1
        ? prevScene
          ? prevScene.trackIds.indexOf(trackId) - prevScene.trackIds.length
          : -1
        : currentSceneIndex
    }
  )

export const makeGetTrackPrevIndex = () =>
  createSelector(
    [getPrevScene, (_, trackId: string) => trackId],
    (prevScene, trackId) => {
      if (!prevScene) return -1
      else return prevScene.trackIds.indexOf(trackId)
    }
  )

export function defaultValue(value: number) {
  return value === undefined ? 1 : value
}

export function pos2str(pos: Types.Position) {
  return pos ? pos.x + '.' + pos.y : null
}

export function str2pos(str: string): Types.Position {
  const split = str.split('.')
  return {
    x: parseInt(split[0]),
    y: parseInt(split[1]),
  }
}

export function getByPos<T>(grid: Types.Grid<T>, pos: Types.Position): T {
  return grid[pos2str(pos)]
}

export const getCurrentControlValues = createSelector([getCurrentScene], (scene) =>
  scene ? scene.controlValues : {}
)

export const getPrevControlValues = createSelector([getPrevScene], (scene) =>
  scene ? scene.controlValues : {}
)

export const getCurrentInitValues = createSelector([getCurrentScene], (scene) =>
  scene ? scene.initValues : {}
)

export const getPrevInitValues = createSelector([getPrevScene], (scene) =>
  scene ? scene.initValues : {}
)

export const makeGetControlAtPos = () =>
  createSelector(
    [getControls, getCurrentControlValues, (_, pos: Types.Position) => pos],
    (controls, values, pos): [Types.ControlGroup, number] => {
      return [getByPos(controls, pos), defaultValue(getByPos(values, pos))]
    }
  )

export const makeGetBindingAtPos = () =>
  createSelector(
    [(state: Types.State) => state.live.bindings, (_, pos: Types.Position) => pos],
    (bindings, pos) => {
      return getByPos(bindings, pos)
    }
  )

export const getTrackIdByIndex = (live: Types.Live, index: number) => {
  if (index >= 0) return live.scenes[live.sceneIndex].trackIds[index]
  else {
    const prev = live.scenes[live.sceneIndex - 1]
    return prev && prev.trackIds[prev.trackIds.length + index]
  }
}

export const makeGetControlTrackId = () =>
  createSelector([getLive, (_, control: Types.Control) => control], (live, control) => {
    if (control && 'trackIndex' in control) {
      return getTrackIdByIndex(live, control.trackIndex)
    } else return undefined
  })

export const makeGetControlAbsValue = () => {
  const getControlTrackId = makeGetControlTrackId()
  return createSelector(
    [
      (state: Types.State, control: Types.Control) => {
        const trackId = getControlTrackId(state, control)
        return trackId && state.live.tracks[trackId].playback
      },
      (state: Types.State, control: Types.Control) => {
        const trackId = getControlTrackId(state, control)
        return trackId && state.sources[trackId].sourceTracks
      },
      (state: Types.State) => state.playback,
      (_, control: Types.Control) => control,
    ],
    (trackPlayback, sourceTracks, playback, control) => {
      let value = null,
        prop = null
      if (control && 'globalProp' in control) {
        value = playback[control.globalProp]
        prop = control.globalProp
      } else if (!sourceTracks) return value
      else if ('trackProp' in control) {
        value = trackPlayback[control.trackProp]
        prop = control.trackProp
      } else if ('sourceTrackProp' in control) {
        const trackSourceId = _.keys(sourceTracks)[control.sourceTrackIndex]
        if (trackSourceId) {
          value = trackPlayback.sourceTracksParams[trackSourceId][control.sourceTrackProp]
          prop = control.sourceTrackProp
        }
      }
      if (value !== null) value = mappings[prop].toStandard(value)
      return value
    }
  )
}

function applyControlsToPlayback(
  trackIndex: number,
  playback: Types.TrackPlayback,
  controls: Types.Controls,
  values: Types.ControlValues,
  initValues: Types.ControlValues,
  enabled: boolean,
  boundsAlpha: number,
  relativeSceneIndex: number
) {
  let outPlayback: Types.TrackPlayback = {
    ...playback,
    alpha: playback.alpha * boundsAlpha,
  }
  if (!enabled) return playback
  _.keys(controls).forEach((posStr) => {
    const controlGroup = controls[posStr],
      initValue = defaultValue(initValues[posStr]),
      defValue = defaultValue(values[posStr]),
      value = Math.pow(initValue > 0.5 ? defValue : 1 - defValue, 1 / 1.6)

    if (controlGroup && !controlGroup.absolute)
      controlGroup.controls.forEach((control) => {
        const controlValue = control.invert ? 1 - value : value
        if ('trackIndex' in control && control.trackIndex === trackIndex) {
          if ('trackProp' in control) {
            outPlayback = {
              ...outPlayback,
              [control.trackProp]:
                defaultValue(outPlayback[control.trackProp]) * controlValue,
            }
          } else if ('sourceTrackProp' in control) {
            const sourceId = _.keys(playback.sourceTracksParams)[control.sourceTrackIndex]
            if (sourceId) {
              outPlayback = {
                ...outPlayback,
                sourceTracksParams: {
                  ...outPlayback.sourceTracksParams,
                  [sourceId]: {
                    ...outPlayback.sourceTracksParams[sourceId],
                    [control.sourceTrackProp]:
                      defaultValue(
                        outPlayback.sourceTracksParams[sourceId][control.sourceTrackProp]
                      ) * controlValue,
                  },
                },
              }
            }
          }
        } else if (
          'relativeSceneIndex' in control &&
          control.relativeSceneIndex === relativeSceneIndex
        ) {
          outPlayback = {
            ...outPlayback,
            sourceTracksParams: _.mapValues(outPlayback.sourceTracksParams, (params) => {
              return { ...params, volume: defaultValue(params.volume) * controlValue }
            }),
            volume: defaultValue(outPlayback.volume) * controlValue,
          }
        }
      })
  })
  return outPlayback
}

export const makeGetTrackPlaybackSelector = () => {
  const getTrackIndex = makeGetTrackIndex(),
    getTrackPrevIndex = makeGetTrackPrevIndex()
  return createSelector(
    [
      getTrackIndex,
      getTrackPrevIndex,
      (state: Types.State, trackId: string) => state.live.tracks[trackId].playback,
      (state: Types.State, trackId: string) => state.live.tracks[trackId].nextPlayback,
      (state: Types.State, trackId: string) => state.sources[trackId].boundsAlpha,
      getControls,
      getPrevControls,
      getCurrentControlValues,
      getPrevControlValues,
      getCurrentInitValues,
      getPrevInitValues,
      (state: Types.State) => state.live.controlsEnabled,
    ],
    (
      trackIndex,
      trackPrevIndex,
      playback,
      nextPlayback,
      boundsAlpha,
      controls,
      prevControls,
      values,
      prevValues,
      initValues,
      prevInitValues,
      enabled
    ) => {
      const relativeSceneIndex = trackIndex < 0 ? -1 : 0
      let newPlayback = applyControlsToPlayback(
          trackIndex,
          playback,
          controls,
          values,
          initValues,
          enabled,
          boundsAlpha,
          relativeSceneIndex
        ),
        newNextPlayback =
          nextPlayback &&
          applyControlsToPlayback(
            trackIndex,
            nextPlayback,
            controls,
            values,
            initValues,
            enabled,
            boundsAlpha,
            relativeSceneIndex
          )

      if (trackIndex < 0) {
        //in previous scene
        newPlayback = applyControlsToPlayback(
          trackPrevIndex,
          newPlayback,
          prevControls,
          prevValues,
          prevInitValues,
          enabled,
          boundsAlpha,
          relativeSceneIndex + 1
        )
        newNextPlayback =
          newNextPlayback &&
          applyControlsToPlayback(
            trackPrevIndex,
            newNextPlayback,
            prevControls,
            prevValues,
            prevInitValues,
            enabled,
            boundsAlpha,
            relativeSceneIndex + 1
          )
      }

      return {
        playback: newPlayback,
        nextPlayback: newNextPlayback,
      }
    }
  )
}

const trackPlaybackSelectors: {
  [trackId: string]: ReturnType<typeof makeGetTrackPlaybackSelector>
} = {}

export const makeGetTrackPlayback = (trackId: string) => {
  if (!trackPlaybackSelectors[trackId])
    trackPlaybackSelectors[trackId] = makeGetTrackPlaybackSelector()
  return trackPlaybackSelectors[trackId]
}

export const getGlobalPlayback = createSelector(
  [
    (state: Types.State) => state.playback,
    getControls,
    getCurrentControlValues,
    getCurrentInitValues,
    (state: Types.State) => state.live.controlsEnabled,
  ],
  (playback, controls, values, initValues, enabled) => {
    if (!enabled) return playback
    let outPlayback = { ...playback },
      needsUpdate = false
    _.keys(controls).forEach((posStr) => {
      const controlGroup = controls[posStr],
        initValue = defaultValue(initValues[posStr]),
        defValue = defaultValue(values[posStr]),
        value = initValue > 0.5 ? defValue : 1 - defValue

      if (controlGroup && !controlGroup.absolute)
        controlGroup.controls.forEach((control) => {
          const controlValue = control.invert ? 1 - value : value
          if ('globalProp' in control) {
            needsUpdate = true
            outPlayback = {
              ...outPlayback,
              [control.globalProp]:
                defaultValue(outPlayback[control.globalProp]) * controlValue,
            }
          }
        })
    })
    return needsUpdate ? outPlayback : playback
  }
)

export const makeGetTrackIsSolo = () =>
  createSelector(
    [(state: Types.State) => state.live.tracks, (_, trackId: string) => trackId],
    (tracks, trackId) => {
      return _.every(tracks, (track, thisTrackId) => {
        if (trackId === thisTrackId) return !track.playback.muted
        else return track.playback.muted
      })
    }
  )

export function getTrackIsSolo(state: Types.State, trackId: string) {
  return _.every(state.live.tracks, (track, thisTrackId) => {
    if (trackId === thisTrackId) return !track.playback.muted
    else return track.playback.muted
  })
}
export const getBindings = createSelector(
  [
    (state: Types.State) => state.live.bindings,
    (state: Types.State) => state.live.controlPresets,
    (state: Types.State) => state.live.globalControls,
  ],
  (bindings, controlPresets, globalControls): Types.BindingsFile => {
    return {
      bindings,
      controlPresets,
      globalControls,
    }
  }
)

export const getTrackIsLoaded = (
  state: Types.State,
  trackId: string,
  sourceTrackId?: string
) => {
  sourceTrackId = sourceTrackId || trackId
  const source = state.sources[trackId],
    sourceTrack = source && state.sources[trackId].sourceTracks[sourceTrackId]
  return sourceTrack && sourceTrack.loaded
}

export const makeGetPersistentTrackPlayback = () =>
  createSelector(
    [(track: Types.Track) => track.playback],
    (playback): Types.PersitentTrackPlayback => {
      return _.omit(playback, ['chunkIndex', 'chunks', 'playing', 'muted', 'preview'])
    }
  )

export const makeGetPersistentTrack = () => {
  const getPlayback = makeGetPersistentTrackPlayback()
  return createShallowSelector(
    [
      getPlayback,
      (track: Types.Track) => track.cues,
      (track: Types.Track) => track.visibleSourceTrack,
      (track: Types.Track) => track.lastPeriod,
    ],
    (playback, cues, visibleSourceTrack, lastPeriod): Types.PersistentTrack => {
      return {
        visibleSourceTrack,
        cues,
        playback,
        lastPeriod,
      }
    }
  )
}

const pTrackSelectors: {
  [trackId: string]: (track: Types.Track) => Types.PersistentTrack
} = {}

export const getPersistentLiveTracks = createSelector(
  [(live: Types.Live) => live.tracks],
  (tracks): Types.PersistentTracks => {
    return _.mapValues(tracks, (track, trackId) => {
      if (!pTrackSelectors[trackId]) pTrackSelectors[trackId] = makeGetPersistentTrack()
      return pTrackSelectors[trackId](track)
    })
  }
)

export const getPersistentLiveBindings = createSelector(
  [(live: Types.Live) => live.bindings],
  (bindings) => {
    return _.mapValues(bindings, (binding) =>
      _.omit(binding, ['badMidiValue', 'lastMidiValue', 'waiting'])
    )
  }
)

export const getPersistentScenes = createSelector(
  [(live: Types.Live) => live.scenes],
  (scenes): Types.PersistentScene[] => {
    return scenes.map((scene) => {
      return _.omit(scene, 'controlValues')
    })
  }
)

export const getPersistentLive = createShallowSelector(
  [getPersistentScenes, getPersistentLiveBindings, getPersistentLiveTracks],
  (scenes, bindings, tracks): Types.PersistentLive => {
    return {
      tracks,
      scenes,
      bindings,
    }
  }
)

export const getPersistentSources = createSelector(
  [(state: Types.State) => state.sources],
  (sources): Types.PersistentSources => {
    return _.mapValues(sources, (source) => {
      return {
        ...source,
        sourceTracks: _.mapValues(source.sourceTracks, (t) =>
          _.pick(t, ['name', 'source', 'streamIndex', 'base'])
        ),
      }
    })
  }
)

export const getPersistentState = createShallowSelector(
  [
    getPersistentSources,
    (state: Types.State) => getPersistentLive(state.live),
    (state: Types.State) => state.playback,
  ],
  (sources, live, playback): Types.PersistentState => {
    return {
      sources,
      playback: {
        ...playback,
        playing: true,
        volume: 1,
      },
      live,
    }
  }
)

export const getLocalPersistentLive = createSelector(
  [
    (state: Types.State) => state.live.bindings,
    (state: Types.State) => state.live.controlPresets,
    (state: Types.State) => state.live.globalControls,
  ],
  (bindings, controlPresets, globalControls): Types.LocalPersistentLive => {
    return {
      bindings,
      controlPresets,
      globalControls,
    }
  }
)

export const getLocalPersistentState = createSelector(
  [
    (state: Types.State) => state.save,
    (state: Types.State) => state.settings,
    (state: Types.State) => state.output,
    getLocalPersistentLive,
  ],
  (save, settings, output, live): Types.LocalPersistentState => {
    return {
      save,
      settings: {
        ...settings,
        screencast: false,
      },
      output: {
        current: output.current,
        preview: output.preview,
      },
      live,
    }
  }
)

export const getMenuState = createSelector(
  [
    (state: Types.State) => state.settings,
    (state: Types.State) => state.output,
    (state: Types.State) => state.live.sceneIndex,
    (state: Types.State) => state.live.scenes.length,
    getSelectedTrackId,
    (state: Types.State) => {
      const track = getSelectedTrack(state)
      return track && track.editing
    },
    (state: Types.State) => {
      const track = getSelectedTrack(state)
      return track && track.playback.playing
    },
    (state: Types.State) => state.playback.playing,
  ],
  (
    settings,
    output,
    sceneIndex,
    scenesCount,
    selectedTrackId,
    editing,
    trackPlaying,
    playing
  ): Types.MenuState => {
    return {
      trackScroll: settings.trackScroll,
      darkMode: settings.darkMode,
      size: settings.size,
      updateRate: settings.updateRate,
      sceneIndex,
      scenesCount,
      output,
      selectedTrackId,
      editing,
      trackPlaying,
      playing,
      snap: settings.snap,
      screencast: settings.screencast,
    }
  }
)

export const getSceneState = createSelector(
  [getPersistentState, (state: Types.State) => state.live.sceneIndex],
  (pstate, sceneIndex) => {
    const currentScene = pstate.live.scenes[sceneIndex]
    return {
      ...pstate,
      live: {
        ...pstate.live,
        scenes: [currentScene],
        tracks: _.pickBy(pstate.live.tracks, (_, trackId) =>
          currentScene.trackIds.includes(trackId)
        ),
      },
      sources: _.pickBy(pstate.sources, (_, sourceId) =>
        currentScene.trackIds.includes(sourceId)
      ),
    }
  }
)

export function getSceneExport(
  state: Types.State,
  sceneIndex: number,
  destPath: string
): Types.PersistentState {
  const pstate = getPersistentState({
      ...state,
      sources: updateSourcesPaths(
        state.sources,
        state.save.path && pathUtils.dirname(state.save.path),
        pathUtils.dirname(destPath)
      ),
    }),
    currentScene = pstate.live.scenes[sceneIndex]
  return {
    ...pstate,
    live: {
      ...pstate.live,
      scenes: [currentScene],
      tracks: _.pickBy(pstate.live.tracks, (_, trackId) =>
        currentScene.trackIds.includes(trackId)
      ),
      bindings: {},
    },
    sources: _.pickBy(pstate.sources, (_, sourceId) =>
      currentScene.trackIds.includes(sourceId)
    ),
  }
}

export const getAllSources = createSelector(
  [(state: Types.State) => state.sources],
  (sources) => {
    const results: Types.SourceInfo[] = []
    _.each(sources, (source, sourceId) => {
      _.each(source.sourceTracks, (sourceTrack, sourceTrackId) => {
        if (sourceTrack.streamIndex === 0)
          results.push({
            sourceId,
            sourceTrackId,
            path: sourceTrack.source,
            missing: sourceTrack.missing,
          })
      })
    })
    return results
  }
)

export const getMissingSources = createSelector([getAllSources], (sources) => {
  return sources.filter((source) => source.missing)
})
