import { Dispatch } from 'redux'
import * as _ from 'lodash'
import pathUtils from 'path'
import fs from 'fs'

import audio from 'render/util/audio'
import * as Actions from 'render/redux/actions'
import { getPath } from 'render/loading/app-paths'

export default async function separate(
  trackName: string,
  trackId: string,
  dispatch: Dispatch<any>
) {
  const cacheDir = getPath('cache'),
    cacheDirExists = !!(await fs.promises.stat(cacheDir).catch(e => false))
  if (!cacheDirExists) await fs.promises.mkdir(cacheDir)

  const vocalCachePath = pathUtils.join(cacheDir, trackName + '_vocal.m4a'),
    instruCachePath = pathUtils.join(cacheDir, trackName + '_instru.m4a'),
    cacheHit = !!(await fs.promises.stat(vocalCachePath).catch(e => false))

  if (cacheHit) {
    await audio.loadSource(vocalCachePath, trackId + '_vocal')
    await audio.loadSource(instruCachePath, trackId + '_instru')
  } else {
    audio.separateSource(trackId)
    audio.exportSource(vocalCachePath, trackId + '_vocal')
    audio.exportSource(instruCachePath, trackId + '_instru')
  }

  dispatch(
    Actions.createTrackSource({
      sourceId: trackId,
      sourceTrackId: trackId + '_vocal',
      sourceTrack: {
        name: 'Vocal - ' + trackName,
        source: vocalCachePath,
        loaded: true,
      },
    })
  )
  dispatch(
    Actions.setTrackSourceParams({
      trackId: trackId,
      sourceTrackId: trackId + '_vocal',
      sourceTrackParams: {
        volume: 0,
        offset: 0, //cacheHit ? 1024 : 0,
      },
    })
  )

  dispatch(
    Actions.createTrackSource({
      sourceId: trackId,
      sourceTrackId: trackId + '_instru',
      sourceTrack: {
        name: 'Instru - ' + trackName,
        source: instruCachePath,
        loaded: true,
      },
    })
  )
  dispatch(
    Actions.setTrackSourceParams({
      trackId: trackId,
      sourceTrackId: trackId + '_instru',
      sourceTrackParams: {
        volume: 0,
        offset: 0,
      },
    })
  )
}
