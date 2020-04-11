import { ipcRenderer } from 'electron'
import { Store } from 'redux'
import _ from 'lodash'
import pathUtils from 'path'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'

import { loadBindings } from 'render/loading/bindings'
import { loadProject } from 'render/loading/project'

export default function initFileAssoc(store: Store<Types.State>) {
  ipcRenderer.on('openFile', (e, path: string) => {
    const extention = pathUtils.extname(path)
    if (extention === '.syp') loadProject(path, store)
    else if (extention === '.rbind') loadBindings(path, store)
    else store.dispatch(Actions.addTrackAndSource(path))
    console.log('OPEN', path)
  })
  ipcRenderer.send('connect')
}
