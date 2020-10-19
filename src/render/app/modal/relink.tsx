import React, { memo, useState, useCallback, useEffect } from 'react'
import { palette } from 'render/components/theme'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'
import pathUtils from 'path'

import { useSelector, useStore } from 'render/redux/react'
import * as Selectors from 'render/redux/selectors'
import * as Types from 'render/util/types'
import relink from 'render/util/relink'

import Icon from 'render/components/icon'

const RelinkWrapper = ctyled.div.styles({
  width: 40,
  height: 25,
  bg: true,
  border: true,
  rounded: true,
  color: (c) => c.nudge(0.1),
}).extendSheet`
box-shadow:0 0 5px rgba(0,0,0,0.1);
`

const MissingList = ctyled.div.styles({
  flex: 1,
  scroll: true,
  lined: true,
  endLine: true,
  column: true,
})

const MissingMessage = ctyled.div.styles({
  flex: 1,
  align: 'center',
  justify: 'center',
  gutter: 1,
  size: (s) => s * 1.2,
})

const MissingSourceWrapper = ctyled.div.class(active).styles({
  height: 2.5,
  align: 'center',
  color: (c) => c.nudge(0.07),
  bg: true,
  hover: true,
  padd: 1,
  gutter: 1,
}).extendSheet`

`

const MissingSourceNameWrapper = ctyled.div.styles({ flex: 1, height: 1.2 }),
  MissingSourceName = ctyled.div.styles({
    justify: 'flex-end',
  }).extendInline`
    width:100%;
    height:100%;
    display:block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display:block;
    position:absolute;
  `

const missingStyles = { color: (c) => c.as(palette.redalpha) },
  missingStyle = { opacity: 0.7 },
  notMissingStyles = { color: (c) => c.as(palette.primary_green) }

function MissingIcon(props: { stillMissing: boolean }) {
  return props.stillMissing ? (
    <Icon styles={missingStyles} style={missingStyle} name="close-thin" scale={2} />
  ) : (
    <Icon styles={notMissingStyles} name="check" scale={2} />
  )
}

interface MissingSourceProps {
  index: number
  source: Types.SourceInfo
  missing: Types.SourceInfo[]
}

function MissingSource(props: MissingSourceProps) {
  const { source } = props,
    stillMissing = props.missing.find(
      (s) => s.sourceTrackId === source.sourceTrackId && s.sourceId === source.sourceId
    ),
    store = useStore(),
    handleClick = useCallback(() => relink(source, store), [source, store])
  return (
    <MissingSourceWrapper onClick={handleClick}>
      <MissingIcon stillMissing={!!stillMissing} />
      <MissingSourceNameWrapper>
        <MissingSourceName>{pathUtils.basename(source.path)}</MissingSourceName>
      </MissingSourceNameWrapper>
    </MissingSourceWrapper>
  )
}

function Relink() {
  const missing = useSelector(Selectors.getMissingSources),
    [initialMissing, setInitialMissing] = useState<Types.SourceInfo[]>([])

  useEffect(() => {
    setInitialMissing(
      _.uniqBy(
        [...initialMissing, ...missing],
        (src) => src.sourceId + '-' + src.sourceTrackId
      )
    )
  }, [missing])

  return (
    <RelinkWrapper>
      {missing.length ? (
        <MissingList>
          {initialMissing.map((_, index) => (
            <MissingSource
              key={index}
              index={index}
              source={initialMissing[index]}
              missing={missing}
            />
          ))}
        </MissingList>
      ) : (
        <MissingMessage>
          <MissingIcon stillMissing={false} />
          <span>No Missing Sources</span>
        </MissingMessage>
      )}
    </RelinkWrapper>
  )
}

export default memo(Relink)
