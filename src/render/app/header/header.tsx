import React from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import PeriodControl from './period-control'
import PlaybackControl from './playback'
import VolumeControl from './volume'
import { isMac } from 'src/render/util/env'

const HeaderWrapper = ctyled.div.styles({
  bg: true,
  color: c => c.nudge(0.05).contrast(-0.1),
  align: 'center',
  gutter: 1,
}).extendSheet`
  ${({ size }) =>
    isMac
      ? `height:${72 / window.devicePixelRatio}px;
        -webkit-app-region: drag;
        padding-left:${144 / window.devicePixelRatio}px;`
      : `height:${size * 3}px;`}
`

export default function Header() {
  return (
    <HeaderWrapper>
      <PlaybackControl />
      <VolumeControl />
      <PeriodControl />
    </HeaderWrapper>
  )
}