import React, { useCallback, useRef, useEffect } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import { palette } from 'render/components/theme'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'
import addTrack from 'render/redux/add-track'

import Tracks from './tracks/tracks'
import Sidebar from './info/sidebar'
import Header from './header/header'
import Controls from './controls/controls'

const Wrapper = ctyled.div.styles({
  color: c =>
    c
      .as(palette.gray)
      .absLum(0.8)
      .contrast(0.2),
  size: 11,
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

const BodyInner = ctyled.div.styles({
  flex: 1,
  column: true,
  height: '100%',
})

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
    sourcelen = sourceIds.length,
    input = useRef(null)

  useEffect(() => {
    input.current = document.createElement('input')
    input.current.type = 'file'
    input.current.onchange = e => {
      const { files } = input.current
      addTrack(files[0], dispatch)
      input.current.value = ''
    }
  }, [])

  return (
    <Wrapper
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'o' && e.metaKey) input.current.click()
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
        <BodyInner>
          <Tracks />
          <Controls />
        </BodyInner>
      </Body>
    </Wrapper>
  )
}
