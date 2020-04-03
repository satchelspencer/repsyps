import electron from 'electron'
import React, { useRef, useMemo, useState, useEffect, memo } from 'react'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'
import pad from 'pad'
import pathUtils from 'path'

import { useSelector, useDispatch, useStore } from 'render/redux/react'
import { getPath } from 'render/loading/app-paths'

import audio, { RATE } from 'render/util/audio'
import uid from 'render/util/uid'
import { waveformLine } from 'render/app/tracks/canvas'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'

import Icon from 'render/components/icon'
import Button from 'render/components/button'
import { palette } from 'src/render/components/theme'

const { Menu, dialog, BrowserWindow } = electron.remote

const RecordingWrapper = ctyled.div.attrs({ visible: false }).styles({
  height: 3,
  lined: true,
  bg: true,
}).extend`
  ${(_, { visible }) => !visible && 'display:none;'}
  z-index:1;
  box-shadow:0 0 10px rgba(0,0,0,0.1);
`

const RecordingControls = ctyled.div.styles({
  gutter: 1,
  padd: 1,
  align: 'center',
})

const WaveformWrapper = ctyled.div.styles({
  color: c => c.contrast(0.2),
  flex: 1,
  bg: true,
  alignSelf: 'stretch',
})

const TimeCode = ctyled.div.styles({
  height: 1.7,
  width: 7,
  border: 1,
  borderColor: c => c.contrast(-0.1),
  color: c => c.nudge(0.05),
  align: 'center',
  justify: 'center',
  bg: true,
}).extendSheet`
  font-family:monospace;
`

const RecCanvas = ctyled.canvas.extend`
  position:absolute;
  width:100%;
  height:100%;
`

const UPDATE_THRESH = 44100 / 5

function Recording() {
  const recLength = useSelector(
      state => Math.floor(state.timing.recTime * UPDATE_THRESH) / UPDATE_THRESH
    ),
    { enabled, fromTrack } = useSelector(state => state.recording),
    selectedTrackId = useSelector(Selectors.getSelectedTrackId),
    dispatch = useDispatch(),
    store = useStore(),
    lenSeconds = recLength / RATE,
    lenMinutes = lenSeconds / 60

  const container = useRef(null),
    [pos, setPos] = useState({
      width: 0,
      height: 0,
    })

  useEffect(() => {
    const width = container.current ? container.current.offsetWidth : 0,
      height = container.current ? container.current.offsetHeight : 0
    setPos({ width, height })
  }, [container.current && container.current.offsetWidth])

  const pwidth = pos.width * 2,
    pheight = pos.height * 2,
    drawBuffer = useMemo(() => new Float32Array(pwidth * 2), [pos.width]),
    scale = 200,
    sampleWidth = scale * pwidth,
    start = recLength > sampleWidth ? recLength - sampleWidth : 0

  const canvasRef = useRef(null),
    ctxt = useRef(null)

  useEffect(() => {
    ctxt.current = canvasRef.current.getContext('2d')
    ctxt.current.scale(2, 2)
    ctxt.current.imageSmoothingEnabled = false
  }, [])

  /* main waveform compute */
  useEffect(() => {
    if (pos.width) audio.getWaveform('_recording', start, scale, drawBuffer)

    ctxt.current.clearRect(0, 0, pwidth, pheight)
    if (recLength) waveformLine(pwidth, pheight, ctxt.current, drawBuffer, 'red', true)
  }, [drawBuffer, recLength, pos.width])

  return (
    <RecordingWrapper visible={enabled}>
      <RecordingControls>
        <Icon
          onClick={async () => {
            if (recLength) {
              const state = store.getState(),
                fromSource = fromTrack ? state.sources[fromTrack] : null,
                fromSourceBounds = fromSource ? fromSource.bounds : [],
                isLoaded = fromSource && fromSource.sourceTracks[fromTrack].loaded

              if (fromSource && !isLoaded) {
                const absPath = pathUtils.resolve(
                  state.save.path || '',
                  fromSource.sourceTracks[fromTrack].source
                )
                await audio.loadSource(absPath, fromTrack)
              }

              dispatch(
                Actions.setRecording({
                  enabled: false,
                })
              )
              const sourceId = uid(),
                bounds = audio.stopRecording(sourceId),
                firstBound = bounds[0],
                prefixBounds = firstBound
                  ? fromSourceBounds.filter(b => firstBound - b > 44100)
                  : [],
                path = dialog.showSaveDialog({
                  title: 'Save Recording',
                  defaultPath: getPath('recordings/untitled'),
                })
              if (path) {
                const outPath = path + '.m4a',
                  srcName = pathUtils.basename(path)
                audio.exportSource(outPath, sourceId)
                dispatch(
                  Actions.createSource({
                    sourceId,
                    source: {
                      name: srcName,
                      bounds: [...prefixBounds, ...bounds],
                      sourceTracks: {
                        [sourceId]: {
                          name: srcName,
                          source: outPath,
                          loaded: true,
                          missing: false,
                          streamIndex: 0,
                        },
                      },
                    },
                  })
                )
                dispatch(
                  Actions.addTrack({
                    trackId: sourceId,
                    sourceTracksParams: {
                      [sourceId]: {
                        volume: 1,
                        offset: 0,
                      },
                    },
                    editing: false,
                  })
                )
              } else {
                audio.removeSource(sourceId)
              }
            } else {
              audio.startRecording(fromTrack)
            }
          }}
          name="record"
          styles={{
            color: c => c.as(['rgba(255,0,0,0.6)', 'rgba(255,0,0,0.6)']),
            size: s => s * 1.4,
          }}
        />
        <TimeCode>
          {pad(2, Math.floor(lenMinutes) + '', '0')}:
          {pad(2, Math.floor(lenSeconds % 60) + '', '0')}.
          {pad(2, ((lenSeconds % 1) + '').substr(2, 2), '0')}
        </TimeCode>
      </RecordingControls>
      <WaveformWrapper inRef={container}>
        <RecCanvas inRef={canvasRef} width={pos.width * 2} height={pos.height * 2} />
      </WaveformWrapper>
      <RecordingControls>
        <Icon
          asButton
          disabled={recLength > 0}
          onClick={() => {
            dispatch(Actions.setRecording({ enabled: false }))
            // audio.stopRecording('nope')
            // audio.removeSource('nope')
          }}
          name="close-thin"
          styles={{
            size: s => s * 1.4,
          }}
        />
      </RecordingControls>
    </RecordingWrapper>
  )
}

export default memo(Recording)
