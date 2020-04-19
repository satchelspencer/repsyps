import React, { memo, useState, useCallback, useEffect, useMemo } from 'react'
import electron from 'electron'
import { palette } from 'render/components/theme'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'
import pathUtils from 'path'
import { batchActions } from 'redux-batched-actions'
import fs from 'fs'

import { useSelector, useDispatch, useStore } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import * as Types from 'render/util/types'

import Icon from 'render/components/icon'

const { dialog } = electron.remote

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
    [initialMissing, setInitialMissing] = useState<Types.SourceInfo[]>([]),
    store = useStore(),
    handleRelink = useCallback(
      (missingSource: Types.SourceInfo) => {
        const path = dialog.showOpenDialog({
          defaultPath: undefined,
          title: 'replace',
          properties: ['openFile'],
          message: `Find ${pathUtils.basename(missingSource.path)}`,
          buttonLabel: 'Relink File'
        })
        if (path && path[0]) {
          const oldPath = missingSource.path,
            actions = []

          missing.forEach((source) => {
            if (
              source.sourceId !== missingSource.sourceId ||
              source.sourceTrackId !== missingSource.sourceTrackId
            ) {
              const pathGuess = pathUtils.resolve(
                pathUtils.dirname(path[0]),
                pathUtils.relative(
                  pathUtils.dirname(oldPath),
                  pathUtils.dirname(source.path)
                ),
                pathUtils.basename(source.path)
              )
              try {
                /* only if the path exists give it a shot */
                fs.statSync(pathGuess)
                actions.push(
                  Actions.relinkTrackSource({
                    sourceId: source.sourceId,
                    sourceTrackId: source.sourceTrackId,
                    newSource: pathGuess,
                  })
                )
              } catch (e) {}
            } else {
              actions.push(
                Actions.relinkTrackSource({
                  sourceId: source.sourceId,
                  sourceTrackId: source.sourceTrackId,
                  newSource: path[0],
                })
              )
            }
          })

          store.dispatch(batchActions(actions, 'RELINK_SOURCES'))
        }
      },
      [missing]
    )

  useEffect(() => {
    setInitialMissing(
      _.uniqBy(
        [...missing, ...initialMissing],
        (src) => src.sourceId + '-' + src.sourceTrackId
      )
    )
  }, [missing])

  return (
    <RelinkWrapper>
      {missing.length ? (
        <MissingList>
          {initialMissing.map((source, index) => {
            const stillMissing = missing.find(
              (s) =>
                s.sourceTrackId === source.sourceTrackId && s.sourceId === source.sourceId
            )
            return (
              <MissingSource key={index} onClick={() => handleRelink(source)}>
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
