import React, { memo, useEffect, useState } from 'react'
import electron from 'electron'
import * as _ from 'lodash'
import ctyled from 'ctyled'
import { keyframes } from 'react-emotion'

import Icon from 'render/components/icon'
import Spinner from 'render/components/spinner'
import Button from 'render/components/button'
import { UpdateStatus } from './modal'
import { Status } from 'render/components/misc'

const rotate = keyframes`
  0% {
    transform:rotate(0deg);
  }
  100% {
    transform:rotate(-360deg);
  }
`
export const Rotater = ctyled.div.extendSheet`
  & svg {
    animation: ${rotate} 40s linear infinite;
  transform-origin:center;
  }
`

const AboutWrapper = ctyled.div.styles({
  bg: true,
  border: true,
  rounded: true,
  padd: 3.5,
  column: true,
  gutter: 2,
  color: (c) => c.contrast(-0.2),
  align: 'center',
}).extendSheet`
  box-shadow:0 0 5px rgba(0,0,0,0.1);
`

export interface UpdateProps {
  updateStatus: UpdateStatus
  autoUpdater: any
}

function Update(props: UpdateProps) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    if (props.updateStatus !== 'downloading') props.autoUpdater.checkForUpdates()
    setTimeout(() => setDone(true), 1000)
  }, [])
  return (
    <AboutWrapper>
      {props.updateStatus === null && done && (
        <Status>
          <Icon name="check" scale={2} />
          &nbsp; REPSYPS is up to date!
        </Status>
      )}
      {(props.updateStatus === 'checking' || !done) &&
        props.updateStatus !== 'downloading' && (
          <Status>
            <Spinner />
            &nbsp;checking...
          </Status>
        )}
      {props.updateStatus === 'error' && <Status err>update check failed</Status>}
      {props.updateStatus === 'downloading' && (
        <Status>
          <Spinner />
          &nbsp;downloading update...
        </Status>
      )}
      {props.updateStatus === 'ready' && (
        <>
          <Status styles={{ size: (s) => s * 1.5 }}>
            <Icon name="repsyps" />
            <div>update ready!</div>
          </Status>
          <Button
            onClick={() =>
              setImmediate(() => {
                electron.remote.app.removeAllListeners('window-all-closed')
                props.autoUpdater.quitAndInstall()
              })
            }
          >
            restart repsyps and update
          </Button>
        </>
      )}
    </AboutWrapper>
  )
}

export default memo(Update)
