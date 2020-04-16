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

export const getCurrentScene = (state: Types.State) =>
  state.live.scenes[state.live.sceneIndex]

export const getPrevScene = (state: Types.State) =>
  state.live.scenes[state.live.sceneIndex - 1]

export const getNextScene = (state: Types.State) =>
  state.live.scenes[state.live.sceneIndex + 1]

export function getActiveTrackIdsFromLive(live: Types.Live, sceneIndex?: number) {
  if (sceneIndex === undefined) sceneIndex = live.sceneIndex
  const currentScene = live.scenes[sceneIndex],
    prevScene = live.scenes[sceneIndex - 1],
    lastOfPrev = prevScene && _.last(prevScene.trackIds)

  return currentScene
    ? lastOfPrev
      ? [lastOfPrev, ...currentScene.trackIds]
      : currentScene.trackIds
    : []
}

export function getActiveTrackIds(state: Types.State, sceneIndex?: number): string[] {
  return getActiveTrackIdsFromLive(state.live, sceneIndex)
}

export function getControls(live: Types.Live): Types.Controls {
  return (live.scenes[live.sceneIndex] && live.scenes[live.sceneIndex].controls) || {}
}

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

export const makeGetControlAtPos = () =>
  createSelector(
    [
      (state: Types.State) => getControls(state.live),
      (state: Types.State) => state.live.controlValues,
      (_, pos: Types.Position) => pos,
    ],
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
  createSelector(
    [
      (state: Types.State) => getCurrentScene(state).trackIds,
      (_, control: Types.Control) => control,
    ],
    (trackIds, control) => {
      if (control && 'trackIndex' in control) return trackIds[control.trackIndex]
      else return undefined
    }
  )

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
  boundsAlpha: number
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
      value = initValue > 0.5 ? defValue : 1 - defValue

    if (!controlGroup.absolute)
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
        }
      })
  })
  return outPlayback
}

export const makeGetTrackPlayback = () => {
  const getTrackIndex = makeGetTrackIndex()
  return createSelector(
    [
      getTrackIndex,
      (state: Types.State, trackId: string) => state.live.tracks[trackId].playback,
      (state: Types.State, trackId: string) => state.live.tracks[trackId].nextPlayback,
      (state: Types.State, trackId: string) => state.sources[trackId].boundsAlpha,
      (state: Types.State) => getControls(state.live),
      (state: Types.State) => state.live.controlValues,
      (state: Types.State) => state.live.initValues,
      (state: Types.State) => state.live.controlsEnabled,
    ],
    (
      trackIndex,
      playback,
      nextPlayback,
      boundsAlpha,
      controls,
      values,
      initValues,
      enabled
    ) => {
      return {
        playback: applyControlsToPlayback(
          trackIndex,
          playback,
          controls,
          values,
          initValues,
          enabled,
          boundsAlpha
        ),
        nextPlayback:
          nextPlayback &&
          applyControlsToPlayback(
            trackIndex,
            nextPlayback,
            controls,
            values,
            initValues,
            enabled,
            boundsAlpha
          ),
      }
    }
  )
}

export const getGlobalPlayback = createSelector(
  [
    (state: Types.State) => state.playback,
    (state: Types.State) => getControls(state.live),
    (state: Types.State) => state.live.controlValues,
    (state: Types.State) => state.live.initValues,
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

      if (!controlGroup.absolute)
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
    (state: Types.State) => state.live.defaultPresetId,
  ],
  (bindings, controlPresets, defaultPresetId) => {
    return {
      bindings,
      controlPresets,
      defaultPresetId,
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
      return _.omit(playback, ['chunkIndex', 'chunks', 'playing', 'muted'])
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

export const getPersistentLive = createShallowSelector(
  [
    (live: Types.Live) => live.scenes,
    getPersistentLiveBindings,
    (live: Types.Live) => live.controlPresets,
    (live: Types.Live) => live.defaultPresetId,
    getPersistentLiveTracks,
  ],
  (scenes, bindings, controlPresets, defaultPresetId, tracks): Types.PersistentLive => {
    return {
      tracks,
      scenes,
      bindings,
      controlPresets,
      defaultPresetId,
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
          _.pick(t, ['name', 'source', 'streamIndex'])
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

export const getLocalPersistentState = createSelector(
  [
    (state: Types.State) => state.save,
    (state: Types.State) => state.settings,
    (state: Types.State) => state.output,
  ],
  (save, settings, output): Types.LocalPersistentState => {
    return {
      save,
      settings,
      output: {
        current: output.current,
      },
    }
  }
)

export const getMenuState = createSelector(
  [
    (state: Types.State) => state.settings,
    (state: Types.State) => state.output,
    (state: Types.State) => state.live.sceneIndex,
    (state: Types.State) => state.live.scenes.length,
  ],
  (settings, output, sceneIndex, scenesCount) => {
    return {
      trackScroll: settings.trackScroll,
      darkMode: settings.darkMode,
      size: settings.size,
      updateRate: settings.updateRate,
      sceneIndex,
      scenesCount,
      output,
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
        pathUtils.dirname(state.save.path),
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
      controlPresets: {},
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
