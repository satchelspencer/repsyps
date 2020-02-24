import React, { memo, useCallback, useRef, useEffect, useMemo } from 'react'
import { palette } from 'render/components/theme'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import addTrack from 'render/util/add-track'

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

function App() {
  const selectedTrackId = useSelector(Selectors.getSelectedTrackId),
    selectedTrack = useSelector(Selectors.getSelectedTrack),
    playing = useSelector(state => state.playback.playing),
    scenes = useSelector(state => state.live.scenes),
    trackIds = useMemo(() => _.flatMap(scenes, scene => scene.trackIds), [scenes]),
    dispatch = useDispatch(),
    tracklen = trackIds.length,
    input = useRef(null),
    handleDragover = useCallback(e => e.preventDefault(), []),
    handleDrop = useCallback(e => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      addTrack(file, dispatch)
    }, [])

  useEffect(() => {
    input.current = document.createElement('input')
    input.current.type = 'file'
    input.current.onchange = e => {
      const { files } = input.current
      addTrack(files[0], dispatch)
      input.current.value = ''
    }
    window.addEventListener('dragover', handleDragover)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragover', handleDragover)
      window.removeEventListener('drop', handleDrop)
    }
  }, [])

  return (
    <Wrapper
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'o' && e.metaKey) input.current.click()
        if (e.key === ' ') e.preventDefault()
        if (e.key === ' ' && !e.shiftKey)
          selectedTrackId &&
            dispatch(
              Actions.setTrackPlayback({
                trackId: selectedTrackId,
                playback: {
                  playing: !selectedTrack.playback.playing,
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
            Actions.selectTrackExclusive(
              trackIds[(trackIds.indexOf(selectedTrackId) + tracklen - 1) % tracklen]
            )
          )
        if (e.key === 'ArrowDown')
          dispatch(
            Actions.selectTrackExclusive(
              trackIds[(trackIds.indexOf(selectedTrackId) + tracklen + 1) % tracklen]
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

export default memo(App)
