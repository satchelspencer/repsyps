import React, { memo, useMemo, useRef, useEffect, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'
import pathUtils from 'path'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import * as Types from 'render/util/types'
import { getId } from 'render/util/uid'

import { adder } from 'render/components/control-adder'
import Volume from 'render/components/volume'
import Icon from 'render/components/icon'
import { WideButton } from 'render/components/misc'
import SidebarItem from 'render/components/item'
import volume from './volume'

const TracksWrapper = ctyled.div.styles({
  gutter: 1,
  column: true,
})

const TrackName = ctyled.div.attrs({ selected: false }).styles({
  flex: 1,
  height: 1.3,
})

const TrackNameInner = ctyled.div.styles({}).extendSheet`
  position:absolute;
  width:100%;
  top:0;
  left:0;
  display:block;
  overflow:hidden;
  white-space:nowrap;
  text-overflow:ellipsis;
  font-weight:bold;
`

const TrackWrapper = ctyled.div.attrs({ loaded: false }).styles({
  column: true,
  flex: 1,
  padd: 0.75,
  bg: true,
  color: (c) => c.nudge(0.05),
  rounded: true,
  border: true,
  borderColor: (c) => c.contrast(-0.1),
}).extend`
  opacity:${(_, { loaded }) => (loaded ? 1 : 0)};
`

const TrackH = adder(
  ctyled.div.styles({
    gutter: 1,
    width: '100%',
    align: 'center',
  })
)

const TrackHead = ctyled.div.styles({
  gutter: 1,
  align: 'center',
})

const SoloButton = ctyled.div.class(active).styles({
  bg: true,
  hover: true,
  color: (c) => c.nudge(0.1),
  height: 2,
  width: 2,
  rounded: true,
  align: 'center',
  size: (s) => s * 0.9,
  justify: 'center',
})

export interface TrackVolumeProps {
  trackId: string
}

interface SourceTrackProps {
  trackId: string
  sourceTrackId: string
  sourceTrack: Types.TrackSource
  trackIndex: number
  sourceTrackIndex: number
  params: Types.TrackSourceParams
  many: boolean
  visible: boolean
}

const SourceTrack = memo((props: SourceTrackProps) => {
  const dispatch = useDispatch(),
    setVisible = useCallback(
      () =>
        dispatch(
          Actions.setVisibleSourceTrack({
            trackId: props.trackId,
            visibleSourceTrack: props.sourceTrackId,
          })
        ),
      [props.trackId, props.sourceTrackId]
    ),
    removeTrackSource = useCallback(
      () =>
        dispatch(
          Actions.removeTrackSource({
            sourceId: props.trackId,
            sourceTrackId: props.sourceTrackId,
          })
        ),
      [props.trackId, props.sourceTrackId]
    ),
    volumeControlParams = useMemo(
      () => ({
        trackIndex: props.trackIndex,
        sourceTrackIndex: props.sourceTrackIndex,
        sourceTrackProp: 'volume',
      }),
      [props.trackIndex, props.sourceTrackIndex]
    ),
    handleVolumeChange = useCallback(
      (v) =>
        dispatch(
          Actions.setTrackSourceParams({
            trackId: props.trackId,
            sourceTrackId: props.sourceTrackId,
            sourceTrackParams: { volume: v },
          })
        ),
      [props.trackId, props.sourceTrackId]
    ),
    handleSolo = useCallback(
      (e: React.MouseEvent) =>
        dispatch(
          e.shiftKey
            ? Actions.setTrackSourceParams({
                trackId: props.trackId,
                sourceTrackId: props.sourceTrackId,
                sourceTrackParams: { volume: 1 },
              })
            : Actions.soloTrackSource({
                trackId: props.trackId,
                sourceTrackId: props.sourceTrackId,
              })
        ),
      [props.trackId, props.sourceTrackId]
    )
  return (
    <SidebarItem
      key={props.sourceTrackId}
      title={
        <TrackWrapper loaded={props.sourceTrack.loaded}>
          <TrackHead>
            <Icon name="repsyps" scale={1} />
            {props.many && (
              <>
                <Icon
                  asButton
                  name={props.visible ? 'show' : 'hide'}
                  onClick={setVisible}
                  scale={1.2}
                />
                <SoloButton onClick={handleSolo}>S</SoloButton>
              </>
            )}
            <TrackName selected={false}>
              <TrackNameInner>{props.sourceTrack.name}</TrackNameInner>
            </TrackName>
            {props.sourceTrackId !== props.trackId && (
              <Icon onClick={removeTrackSource} asButton name="close-thin" />
            )}
          </TrackHead>
          <TrackH params={volumeControlParams}>
            <Volume noIcon volume={props.params.volume} onChange={handleVolumeChange} />
          </TrackH>
        </TrackWrapper>
      }
    />
  )
})

const SourceTracks = (props: TrackVolumeProps) => {
  const sourceTracksParams = useSelector(
      (state) => state.live.tracks[props.trackId].playback.sourceTracksParams
    ),
    visibleSourceTrackId = useSelector(
      (state) => state.live.tracks[props.trackId].visibleSourceTrack
    ),
    source = useSelector((state) => state.sources[props.trackId]),
    getTrackIndex = useMemo(() => Selectors.makeGetTrackIndex(), []),
    trackIndex = useSelector((state) => getTrackIndex(state, props.trackId)),
    dispatch = useDispatch()

  const input = useRef(null)
  useEffect(() => {
    input.current = document.createElement('input')
    input.current.type = 'file'
    input.current.onchange = (e) => {
      const { files } = input.current
      const id = getId(files[0].path)
      dispatch(
        Actions.createTrackSource({
          sourceId: props.trackId,
          sourceTrackId: id,
          sourceTrack: {
            name: pathUtils.basename(files[0].path),
            source: files[0].path,
            loaded: false,
            missing: false,
            streamIndex: 0,
          },
        })
      )
      dispatch(
        Actions.setTrackSourceParams({
          trackId: props.trackId,
          sourceTrackId: id,
          sourceTrackParams: {
            volume: 0,
            offset: 0,
          },
        })
      )
      input.current.value = ''
    }
  }, [props.trackId])

  const sourceTrackIds = _.keys(source.sourceTracks),
    many = sourceTrackIds.length > 1

  return (
    <TracksWrapper>
      {sourceTrackIds.map((sourceTrackId, sourceTrackIndex) => {
        return (
          <SourceTrack
            key={sourceTrackIndex}
            trackId={props.trackId}
            sourceTrackId={sourceTrackId}
            sourceTrack={source.sourceTracks[sourceTrackId]}
            trackIndex={trackIndex}
            sourceTrackIndex={sourceTrackIndex}
            params={sourceTracksParams[sourceTrackId]}
            many={many}
            visible={visibleSourceTrackId === sourceTrackId}
          />
        )
      })}
      <WideButton onClick={() => input.current.click()}>+ add source</WideButton>
    </TracksWrapper>
  )
}

export default memo(SourceTracks)
