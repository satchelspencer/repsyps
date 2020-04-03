import { remote } from 'electron'
import pathUtils from 'path'
import fs from 'fs'

export default function initPaths() {
  const documents = remote.app.getPath('documents'),
    ensurePaths = [
      'repsyps',
      'repsyps/bindings',
      'repsyps/projects',
      'repsyps/cache',
      'repsyps/recordings',
    ]

  ensurePaths.forEach(path => {
    const p = pathUtils.join(documents, path)
    if (!fs.existsSync(p)) fs.mkdirSync(p)
  })
}

export function getPath(path: string) {
  return pathUtils.join(remote.app.getPath('documents'), 'repsyps', path)
}
