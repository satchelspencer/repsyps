import React, { memo, useCallback, useEffect, useMemo } from 'react'
import { palette } from 'render/components/theme'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'

import Tracks from './tracks/tracks'
import Sidebar from './info/sidebar'
import Header from './header/header'
import Controls from './controls/controls'

const Wrapper = ctyled.div.styles({
  color: (c) => c.as(palette.gray).absLum(0.8).contrast(0.2),
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
    playing = useSelector((state) => state.playback.playing),
    scenes = useSelector((state) => state.live.scenes),
    trackIds = useMemo(() => _.flatMap(scenes, (scene) => scene.trackIds), [scenes]),
    dispatch = useDispatch(),
    tracklen = trackIds.length,
    handleDragover = useCallback((e) => e.preventDefault(), []),
    handleDrop = useCallback((e) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0].path
      dispatch(Actions.addTrackAndSource(file))
    }, [])

  useEffect(() => {
    window.addEventListener('dragover', handleDragover)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragover', handleDragover)
      window.removeEventListener('drop', handleDrop)
    }
  }, [])

  const handleKeyDown = useCallback(
    (e) => {
      const notInInput = document.activeElement.nodeName !== 'INPUT'
      if (e.key === ' ' && notInInput) e.preventDefault()
      if (e.key === ' ' && !e.shiftKey && notInInput)
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
      else if (e.key === ' ' && e.shiftKey && notInInput)
        dispatch(
          Actions.updatePlayback({
            playing: !playing,
          })
        )
      else if (e.key === 'ArrowUp') {
        e.preventDefault()
        dispatch(
          Actions.selectTrackExclusive(
            trackIds[Math.max(trackIds.indexOf(selectedTrackId) - 1, 0)]
          )
        )
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        dispatch(
          Actions.selectTrackExclusive(
            trackIds[Math.min(trackIds.indexOf(selectedTrackId) + 1, tracklen - 1)]
          )
        )
      } else if (e.key === 'l' && selectedTrackId)
        dispatch(
          Actions.setTrackPlayLock({
            trackId: selectedTrackId,
            playlock: !selectedTrack.playLock,
          })
        )
    },
    [selectedTrackId, selectedTrack, trackIds, playing]
  )

  return (
    <Wrapper tabIndex={0} onKeyDown={handleKeyDown}>
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
