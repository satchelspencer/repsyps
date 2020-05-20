import React, { memo, useRef } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useTiming } from 'render/components/timing'

const LevelsWrapper = ctyled.div.styles({
  column: true,
  align: 'center',
  bg: true,
  padd: 1,
  gutter: 1,
  color: (c) => c.contrast(-0.1).nudge(0.1),
})

const LevelBarWrapper = ctyled.div.styles({
  width: 1,
  border: 1,
  flex: 1,
  bg: true,
  color: (c) => c.contrast(0.15),
}).extend`overflow:hidden;`

const red = ['red', 'red']

const ClipIndicator = ctyled.div.attrs({ clip: false }).styles({
  width: 1,
  height: 1,
  bg: true,
  border: 1,
  rounded: 1,
  color: (c) => c.contrast(0.15),
}).extend`
  background:${(_, { clip }) => (clip ? 'rgba(255,0,0,0.5)' : 'rgba(0,220,0,0.5)')};
  transition:0.2s all;
`

const LevelBarInner = ctyled.div.attrs({ clip: false }).styles({
  bg: true,
  color: (c) => c.contrast(-0.3).nudge(-0.1),
}).extend`
  position:absolute;
  left:0;
  right:0;
  bottom:0;
  transition:0.2s background;
`

const MaxLevelBar = ctyled.div.styles({
  bg: true,
  color: (c) => c.invert().contrast(-0.5),
}).extend`
  position:absolute;
  left:0;
  right:0;
  height:1px;
`

function Levels() {
  const { maxLevel: rawLevel } = useTiming(),
    maxLevel = Math.max(Math.log(rawLevel + 0.01) / 4 + 1, 0),
    levels = useRef<number[]>([0])

  levels.current.push(maxLevel)
  if (levels.current.length > 20) levels.current.shift()

  const max = Math.max(_.max(levels.current), maxLevel),
    clip = max > 1

  return (
    <LevelsWrapper>
      <ClipIndicator clip={clip} />
      <LevelBarWrapper>
        <MaxLevelBar
          style={{
            bottom: Math.min(max, 1) * 100 + '%',
            transition: maxLevel > max ? 'none' : '0.2s all',
          }}
        />
        <LevelBarInner
          clip={false}
          style={{
            height: Math.min(maxLevel, 1) * 100 + '%',
            opacity: clip ? 0.5 : 1,
          }}
        />
      </LevelBarWrapper>
    </LevelsWrapper>
  )
}

export default memo(Levels)
