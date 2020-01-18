import React, { useCallback, useMemo, useState } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import { HotKeys } from 'react-hotkeys'
import { palette } from './theme'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import * as Types from 'lib/types'
import * as Actions from 'src/renderer/redux/actions'

import Source from './tracks/source'

const Wrapper = ctyled.div.styles({
  color: c =>
    c
      .as(palette.gray)
      .absLum(0.7)
      .contrast(0.2),
  size: 12,
  column: true,
  bg: true,
  lined: true,
}).extend`
    width:100%;
    height:100%;
    top:0;
    left:0;
    position:absolute;
  `

const Sources = ctyled.div.styles({
  column: true,
  lined: true,
  endLine: true,
  flex: 1,
  scroll: true,
})

export default function App() {
  const getMappedState = useCallback((state: Types.State) => {
    return {
      selected: Object.keys(state.sources).filter(tid => state.sources[tid].selected)[0],
      sources: state.sources,
      playing: state.playback.playing,
    }
  }, [])
  const { selected, playing, sources } = useMappedState(getMappedState),
    dispatch = useDispatch()
  return (
    <Wrapper
      tabIndex={0}
      onKeyDown={e => {
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
      }}
    >
      <Sources>
        {Object.keys(sources).map(sourceId => (
          <Source key={sourceId} sourceId={sourceId} />
        ))}
      </Sources>
    </Wrapper>
  )
}
