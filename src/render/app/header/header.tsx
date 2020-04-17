import React, { useState, useEffect } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'
import { remote } from 'electron'

import PeriodControl from './period-control'
import PlaybackControl from './playback'
import VolumeControl from './volume'
import { isMac } from 'src/render/util/env'

const HeaderWrapper = ctyled.div.attrs({ fixed: false }).styles({
  bg: true,
  color: (c) => c.nudge(0.05).contrast(-0.1),
  align: 'center',
  gutter: 1,
}).extendSheet`
  ${({ size }, { fixed }) =>
    fixed
      ? `height:${72 / window.devicePixelRatio}px;
        -webkit-app-region: drag;
        padding-left:${144 / window.devicePixelRatio}px;`
      : `height:${size * 3}px;`}
`

const bwindow = remote.getCurrentWindow()

export default function Header() {
  const [full, setFull] = useState(false)
  useEffect(() => {
    const handleEnter = () => setFull(true),
      handleLeave = () => setFull(false)
    bwindow.on('enter-full-screen', handleEnter)
    bwindow.on('leave-full-screen', handleLeave)
    return () => {
      bwindow.removeListener('enter-full-screen', handleEnter)
      bwindow.removeListener('leave-full-screen', handleLeave)
    }
  }, [])
  const fixed = isMac && !full
  return (
    <HeaderWrapper fixed={fixed}>
      <PlaybackControl />
      <VolumeControl />
      <PeriodControl />
    </HeaderWrapper>
  )
}
