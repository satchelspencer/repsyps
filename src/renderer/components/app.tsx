import React, { useCallback, useMemo, useState } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import { palette } from './theme'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import * as Types from 'lib/types'
import * as Actions from 'src/renderer/redux/actions'

import Source from './tracks/source'
import Sidebar from './sidebar'
import Header from './header'

const Wrapper = ctyled.div.styles({
  color: c =>
    c
      .as(palette.gray)
      .absLum(0.8)
      .contrast(0.2),
  size: 12,
  bg: true,
  lined: true,
  align: 'stretch',
  column: true,
}).extend`
    width:100%;
    height:100%;
    top:0;
    left:0;
    position:absolute;
    overflow:hidden;
  `

const Body = ctyled.div.styles({
  flex: 1,
  lined: true,
}).extend`
  margin-top:1px;
`

const Sources = ctyled.div.styles({
  column: true,
  lined: true,
  endLine: true,
  flex: 1,
  scroll: true,
  color: c => c.nudge(0.025),
  bg: true,
}).extend`
  overflow:visible;
`

export default function App() {
  const getMappedState = useCallback((state: Types.State) => {
      return {
        selected: Object.keys(state.sources).filter(
          tid => state.sources[tid].selected
        )[0],
        sources: state.sources,
        playing: state.playback.playing,
      }
    }, []),
    { selected, playing, sources } = useMappedState(getMappedState),
    dispatch = useDispatch(),
    sourceIds = Object.keys(sources),
    sourcelen = sourceIds.length

  return (
    <Wrapper
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === ' ') e.preventDefault()
        if (e.key === ' ' && !e.shiftKey)
          selected &&
            dispatch(
              Actions.setSourcePlayback({
                sourceId: selected,
                playback: {
                  playing: !sources[selected].playback.playing,
                  chunkIndex: -1,
                },
              })
            )
        if (e.key === ' ' && e.shiftKey)
          dispatch(
            Actions.updatePlayback({
              playing: !playing,
            })
          )
        if (e.key === 'ArrowUp')
          dispatch(
            Actions.selectSourceExclusive(
              sourceIds[(sourceIds.indexOf(selected) + sourcelen - 1) % sourcelen]
            )
          )
        if (e.key === 'ArrowDown')
          dispatch(
            Actions.selectSourceExclusive(
              sourceIds[(sourceIds.indexOf(selected) + sourcelen + 1) % sourcelen]
            )
          )
      }}
    >
      <Header />
      <Body>
        <Sidebar />
        <Sources>
          {sourceIds.map(sourceId => (
            <Source key={sourceId} sourceId={sourceId} />
          ))}
        </Sources>
      </Body>
    </Wrapper>
  )
}
