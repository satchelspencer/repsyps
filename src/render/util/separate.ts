import { Dispatch } from 'redux'
import * as _ from 'lodash'
import pathUtils from 'path'
import fs from 'fs'
import { batchActions } from 'redux-batched-actions'

import audio from 'render/util/audio'
import * as Actions from 'render/redux/actions'
import { getPath } from 'render/loading/app-paths'

export default async function separate(
  trackName: string,
  sourceId: string,
  dispatch: Dispatch<any>
) {
  const cacheDir = getPath('cache'),
    cacheDirExists = !!(await fs.promises.stat(cacheDir).catch((e) => false))
  if (!cacheDirExists) await fs.promises.mkdir(cacheDir)

  const vocalCachePath = pathUtils.join(cacheDir, trackName + '_vocal.m4a'),
    instruCachePath = pathUtils.join(cacheDir, trackName + '_instru.m4a'),
    cacheHit = !!(await fs.promises.stat(vocalCachePath).catch((e) => false))

  if (cacheHit) {
    await audio.loadSource(vocalCachePath, sourceId + '_vocal')
    await audio.loadSource(instruCachePath, sourceId + '_instru')
  } else {
    await audio.separateSource(sourceId)
    audio.exportSource(vocalCachePath, sourceId + '_vocal')
    audio.exportSource(instruCachePath, sourceId + '_instru')
  }

  dispatch(
    batchActions(
      [
        Actions.createTrackSource({
          sourceId,
          sourceTrackId: sourceId + '_vocal',
          sourceTrack: {
            name: 'Vocal - ' + trackName,
            source: vocalCachePath,
            loaded: true,
            missing: false,
            streamIndex: 0,
            base: null,
          },
        }),
        Actions.createTrackSource({
          sourceId,
          sourceTrackId: sourceId + '_instru',
          sourceTrack: {
            name: 'Instru - ' + trackName,
            source: instruCachePath,
            loaded: true,
            missing: false,
            streamIndex: 0,
            base: null,
          },
        }),
      ],
      'ADD_SEPARATED_TRACKS'
    )
  )
}
