import React, { memo, useMemo, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import * as Types from 'render/util/types'
import useAddSource from 'render/util/add-source'

import { adder } from 'render/components/control-adder'
import Volume from 'render/components/volume'
import Icon from 'render/components/icon'
import { WideButton } from 'render/components/misc'
import SidebarItem from 'render/components/item'

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
  realParams: Types.TrackSourceParams
  many: boolean
  visible: boolean
}

const SourceTrack = memo((props: SourceTrackProps) => {
  const dispatch = useDispatch(),
    sourceId = useSelector((state) => state.live.tracks[props.trackId].sourceId),
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
        sourceId &&
        dispatch(
          Actions.removeTrackSource({
            sourceId,
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
            <Volume
              noIcon
              volume={props.params.volume}
              real={props.realParams.volume}
              onChange={handleVolumeChange}
            />
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
    getTrackPlayback = useMemo(() => Selectors.makeGetTrackPlayback(props.trackId), []),
    realParams = useSelector((state) => getTrackPlayback(state, props.trackId)).playback
      .sourceTracksParams,
    visibleSourceTrackId = useSelector(
      (state) => state.live.tracks[props.trackId].visibleSourceTrack
    ),
    source = useSelector((state) => Selectors.getSourceByTrackId(state, props.trackId)),
    getTrackIndex = useMemo(() => Selectors.makeGetTrackIndex(), []),
    trackIndex = useSelector((state) => getTrackIndex(state, props.trackId))

  const sourceTrackIds = _.keys(source?.sourceTracks),
    many = sourceTrackIds.length > 1,
    addSource = useAddSource(),
    handleClick = useCallback(() => addSource(props.trackId), [props.trackId])

  return (
    <TracksWrapper>
      {sourceTrackIds.map((sourceTrackId, sourceTrackIndex) => {
        const sourceTrack = source?.sourceTracks[sourceTrackId]
        return (
          sourceTrack && (
            <SourceTrack
              key={sourceTrackIndex}
              trackId={props.trackId}
              sourceTrackId={sourceTrackId}
              sourceTrack={sourceTrack}
              trackIndex={trackIndex}
              sourceTrackIndex={sourceTrackIndex}
              params={sourceTracksParams[sourceTrackId]}
              realParams={realParams[sourceTrackId]}
              many={many}
              visible={visibleSourceTrackId === sourceTrackId}
            />
          )
        )
      })}
      <WideButton onClick={handleClick}>+ add source</WideButton>
    </TracksWrapper>
  )
}

export default memo(SourceTracks)
