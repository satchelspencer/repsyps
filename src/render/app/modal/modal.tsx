import React, { memo, useCallback, useEffect, useState } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'
import { remote } from 'electron'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import { isDev } from 'render/util/env'

import Relink from './relink'
import About from './about'
import Update from './update'
import ChangeLog from './changelog'

const { autoUpdater } = remote.require('electron-updater'),
  log = require('electron-log')
log.transports.file.level = 'debug'
autoUpdater.logger = log
autoUpdater.autoInstallOnAppQuit = true
autoUpdater.allowDowngrade = true
autoUpdater.autoDownload = true

const ModalWrapper = ctyled.div.styles({
  align: 'center',
  justify: 'center',
}).extendSheet`
  position:absolute;
  top:0;
  left:0;
  bottom:0;
  right:0;
  background:${({ color }) => color.bg + 'aa'};
`

const ModalBody = ctyled.div.styles({})

export type UpdateStatus = 'checking' | 'downloading' | 'error' | 'ready'

function Modal() {
  const route = useSelector((state) => state.modalRoute),
    playing = useSelector(Selectors.getAnyTrackPlaying),
    dispatch = useDispatch(),
    handleBodyClick = useCallback((e) => {
      e.stopPropagation()
    }, []),
    handleWrapperClick = useCallback(() => {
      dispatch(Actions.setModalRoute(null))
    }, [route]),
    [updateStatus, setUpdateStatus] = useState<UpdateStatus>(null)

  useEffect(() => {
    if (isDev) return
    autoUpdater.on('checking-for-update', () => setUpdateStatus('checking'))
    autoUpdater.on('update-available', (info) => {
      setUpdateStatus('downloading')
    })
    autoUpdater.on('update-not-available', (info) => setUpdateStatus(null))
    autoUpdater.on('error', (err) => setUpdateStatus('error'))
    autoUpdater.on('update-downloaded', (info) => {
      setUpdateStatus('ready')
    })
    autoUpdater.checkForUpdates()
  }, [])

  useEffect(() => {
    if (!playing && updateStatus === 'ready') dispatch(Actions.setModalRoute('update'))
  }, [playing, updateStatus])

  return (
    route !== null && (
      <ModalWrapper onClick={handleWrapperClick}>
        <ModalBody onClick={handleBodyClick}>
          {route === 'relink' && <Relink />}
          {route === 'about' && <About />}
          {route === 'update' && (
            <Update updateStatus={updateStatus} autoUpdater={autoUpdater} />
          )}
          {route === 'changelog' && <ChangeLog />}
        </ModalBody>
      </ModalWrapper>
    )
  )
}

export default memo(Modal)
