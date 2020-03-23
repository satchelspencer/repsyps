import { Dispatch } from 'redux'
import * as _ from 'lodash'
import { remote } from 'electron'
import pathUtils from 'path'
import fs from 'fs'
import wav from 'node-wav'

import audio, { RATE } from 'render/util/audio'
import * as Actions from 'render/redux/actions'
import { getBuffer, createBuffer } from 'render/util/buffers'
import { addBufferFromAudio } from './add-track'
import { getPath } from 'render/loading/app-paths'

const userData = remote.app.getPath('userData')

export default async function separate(
  trackName: string,
  trackId: string,
  dispatch: Dispatch<any>
) {
  const cacheDir = getPath('cache'),
    cacheDirExists = !!(await fs.promises.stat(cacheDir).catch(e => false))
  if (!cacheDirExists) await fs.promises.mkdir(cacheDir)

  const vocalCachePath = pathUtils.join(cacheDir, trackName + '_vocal.wav'),
    instruCachePath = pathUtils.join(cacheDir, trackName + '_instru.wav'),
    cacheHit = !!(await fs.promises.stat(vocalCachePath).catch(e => false))

  if (cacheHit) {
    const vocal = await fs.promises.readFile(vocalCachePath),
      instru = await fs.promises.readFile(instruCachePath)
    await addBufferFromAudio(trackId + '_vocal', vocal.buffer)
    await addBufferFromAudio(trackId + '_instru', instru.buffer)
  } else {
    const [vocal, instru] = _.chunk(audio.separateSource(getBuffer(trackId)), 2)
    createBuffer(trackId + '_vocal', vocal)
    createBuffer(trackId + '_instru', instru)
    await fs.promises.writeFile(vocalCachePath, wav.encode(vocal, { sampleRate: RATE }))
    await fs.promises.writeFile(instruCachePath, wav.encode(instru, { sampleRate: RATE }))
  }

  dispatch(
    Actions.createTrackSource({
      sourceId: trackId,
      sourceTrackId: trackId + '_vocal',
      sourceTrack: { name: 'Vocal - ' + trackName, source: vocalCachePath },
    })
  )
  dispatch(
    Actions.setTrackSourceParams({
      trackId: trackId,
      sourceTrackId: trackId + '_vocal',
      sourceTrackParams: {
        volume: 0,
        offset: 0,
      },
    })
  )

  dispatch(
    Actions.createTrackSource({
      sourceId: trackId,
      sourceTrackId: trackId + '_instru',
      sourceTrack: { name: 'Instru - ' + trackName, source: instruCachePath },
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
