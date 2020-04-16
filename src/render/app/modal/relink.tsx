import React, { memo, useState, useCallback, useEffect, useMemo } from 'react'
import { palette } from 'render/components/theme'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'
import pathUtils from 'path'

import { useSelector, useDispatch, useStore } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import relink from 'render/util/relink'

import Icon from 'render/components/icon'
import init from 'src/render/redux/midi-sync'

const RelinkWrapper = ctyled.div.styles({
  width: 40,
  height: 25,
  bg: true,
  border: true,
  rounded: true,
  color: (c) => c.nudge(0.1),
})

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

const MissingSource = ctyled.div.class(active).styles({
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
  }).extend`
    width:100%;
    height:100%;
    display:block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display:block;
    position:absolute;
  `

function Relink() {
  const missing = useSelector(Selectors.getMissingSources),
    [initialMissing, setInitialMissing] = useState<Selectors.MissingSourceInfo[]>([]),
    store = useStore()

  useEffect(() => {
    setInitialMissing(missing)
  }, [])

  return (
    <RelinkWrapper>
      {initialMissing.length ? (
        <MissingList>
          {initialMissing.map((source, index) => {
            const stillMissing = missing.find(
              (s) =>
                s.sourceTrackId === source.sourceTrackId && s.sourceId === source.sourceId
            )
            return (
              <MissingSource
                key={index}
                onClick={() => {
                  relink(source.sourceId, source.sourceTrackId, store)
                }}
              >
                {stillMissing ? (
                  <Icon
                    styles={{ color: (c) => c.as(palette.redalpha) }}
                    style={{ opacity: 0.7 }}
                    name="close-thin"
                    scale={2}
                  />
                ) : (
                  <Icon
                    styles={{ color: (c) => c.as(palette.primary_green) }}
                    name="check"
                    scale={2}
                  />
                )}

                <MissingSourceNameWrapper>
                  <MissingSourceName>{pathUtils.basename(source.path)}</MissingSourceName>
                </MissingSourceNameWrapper>
              </MissingSource>
            )
          })}
        </MissingList>
      ) : (
        <MissingMessage>
          <Icon
            styles={{ color: (c) => c.as(palette.primary_green) }}
            name="check"
            scale={2}
          />
          <span>No Missing Sources</span>
        </MissingMessage>
      )}
    </RelinkWrapper>
  )
}

export default memo(Relink)
