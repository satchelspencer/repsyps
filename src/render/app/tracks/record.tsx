import electron from 'electron'
import React, { useRef, useMemo, useState, useEffect, memo, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'
import pad from 'pad'
import pathUtils from 'path'
import { batchActions } from 'redux-batched-actions'

import { useSelector, useDispatch, useStore } from 'render/redux/react'
import { getPath } from 'render/loading/app-paths'
import { canvasScale } from 'render/util/env'

import audio, { RATE } from 'render/util/audio'
import extend from 'render/util/extend'
import uid from 'render/util/uid'
import { waveformLine } from 'render/app/tracks/canvas'
import * as Actions from 'render/redux/actions'
import { useTiming } from 'render/components/timing'

import Icon from 'render/components/icon'
import useMeasure from 'render/components/measure'

const { dialog } = electron.remote

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
  color: (c) => c.contrast(0.2),
  flex: 1,
  bg: true,
  alignSelf: 'stretch',
})

const TimeCode = ctyled.div.styles({
  height: 1.7,
  width: 7,
  border: 1,
  borderColor: (c) => c.contrast(-0.1),
  color: (c) => c.nudge(0.05),
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

const UPDATE_THRESH = 44100 / 20

export interface RecordingProps {
  recLength: number
  time: number
  enabled: boolean
}

const RIcon = extend(Icon, () => ({
  styles: {
    color: (c) => c.as(['rgba(255,0,0,0.6)', 'rgba(255,0,0,0.6)']),
  },
}))

const Recording = memo(
  (props: RecordingProps) => {
    const { recLength, time, enabled } = props,
      { fromTrack } = useSelector((state) => state.recording),
      period = useSelector((state) => state.playback.period),
      dispatch = useDispatch(),
      store = useStore(),
      [started, setStarted] = useState(false),
      preRecord = fromTrack && started && !recLength,
      lenSeconds = preRecord
        ? ((1 - (time - Math.floor(time))) * period) / RATE
        : recLength / RATE,
      lenMinutes = lenSeconds / 60

    const container = useRef(null),
      pos = useMeasure(container)

    const pwidth = pos.width * canvasScale,
      pheight = pos.height * canvasScale,
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
      if (recLength)
        waveformLine(
          pwidth,
          pheight,
          ctxt.current,
          drawBuffer,
          'rgba(255,0,0,0.35)',
          true
        )
    }, [drawBuffer, recLength, pos.width])

    const handleClick = useCallback(async () => {
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
              ? fromSourceBounds.filter((b) => firstBound - b > 44100)
              : [],
            path = dialog.showSaveDialog({
              nameFieldLabel: 'Recording Name',
              defaultPath: getPath('recordings/untitled'),
              buttonLabel: 'Save Recording',
              filters: [
                {
                  name: 'AAC Audio',
                  extensions: ['m4a'],
                },
              ],
            })
          if (path) {
            const outPath = path,
              srcName = pathUtils.basename(path)
            audio.exportSource(outPath, sourceId)
            dispatch(
              batchActions(
                [
                  Actions.createSource({
                    sourceId,
                    name: srcName,
                    bounds: [...prefixBounds, ...bounds],
                    source: outPath,
                    loaded: true,
                  }),
                  Actions.addTrack({
                    trackId: sourceId,
                    sourceTracksParams: {
                      [sourceId]: {
                        volume: 1,
                        offset: 0,
                      },
                    },
                    editing: false,
                  }),
                  Actions.setTrackSync({
                    trackId: sourceId,
                    sync: 'off',
                  }),
                ],
                'ADD_RECORDED_SOURCE'
              )
            )
          } else {
            audio.removeSource(sourceId)
          }
          setStarted(false)
        } else {
          setStarted(true)
          audio.startRecording(fromTrack)
          dispatch(Actions.updatePlayback({ playing: true }))
        }
      }, [!recLength, fromTrack]),
      handleCancel = useCallback(() => {
        dispatch(Actions.setRecording({ enabled: false }))
        if (started) {
          audio.stopRecording('nope')
          audio.removeSource('nope')
          setStarted(false)
        }
      }, [started])

    return (
      <RecordingWrapper visible={enabled}>
        <RecordingControls>
          <RIcon scale={1.4} onClick={handleClick} asButton name="record" />
          <TimeCode>
            {preRecord ? '-' : '+'}
            {pad(2, Math.floor(lenMinutes) + '', '0')}:
            {pad(2, Math.floor(lenSeconds % 60) + '', '0')}.
            {pad(2, ((lenSeconds % 1) + '').substr(2, 2), '0')}
          </TimeCode>
        </RecordingControls>
        <WaveformWrapper inRef={container}>
          <RecCanvas
            inRef={canvasRef}
            width={pos.width * canvasScale}
            height={pos.height * canvasScale}
          />
        </WaveformWrapper>
        <RecordingControls>
          <Icon scale={1.4} asButton onClick={handleCancel} name="close-thin" />
        </RecordingControls>
      </RecordingWrapper>
    )
  },
  (prevProps, nextProps) => {
    return (
      (!nextProps.enabled && !prevProps.enabled) ||
      (prevProps.time === nextProps.time && prevProps.enabled === nextProps.enabled)
    )
  }
)

export default function RecordingContainer() {
  const { recTime, time } = useTiming(),
    enabled = useSelector((state) => state.recording.enabled)

  return useMemo(() => {
    return <Recording recLength={recTime} time={time} enabled={enabled} />
  }, [Math.floor(recTime / UPDATE_THRESH), Math.floor(time / UPDATE_THRESH), enabled])
}
