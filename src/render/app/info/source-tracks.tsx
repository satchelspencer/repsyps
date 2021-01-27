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
import { WideButton, Horizontal, SidebarValue } from 'render/components/misc'
import SidebarItem from 'render/components/item'

const SourcesWrapper = ctyled.div.styles({
  column: true,
  lined: true,
  bg: true,
  color: (c) => c.nudge(0.1),
})

const SourcesBody = ctyled.div.styles({
  gutter: 1,
  column: true,
  padd: 1,
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
}).extendInline`
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

const OffsetValue = SidebarValue.attrs({ active: false }).styles({
  width: 'auto',
  size: (s) => s * 0.9,
  alignSelf: 'flex-start',
}).extendSheet`
  outline:none;
  border:1px solid ${({ color }, { active }) =>
    active ? 'rgba(255,0,0,0.5)' : color.bq};
  background:${({ color }, { active }) =>
    active ? 'rgba(255,0,0,0.1) !important' : color.bg};
`

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
  offsetEditing: boolean
}

const getOffsetStr = (offset: number): string => {
  if (Math.abs(offset) < 100) offset = 0
  if (offset === 0) return '+0.00'
  else {
    const rounded = _.round(offset / 44100, 2)
    return _.padEnd((rounded > 0 ? '+' : '') + rounded, 5, '0')
  }
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
        trackId: props.trackId,
        sourceTrackIndex: props.sourceTrackIndex,
        sourceTrackProp: 'volume',
      }),
      [props.trackId, props.sourceTrackIndex]
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
    ),
    handleMute = useCallback(() => {
      dispatch(
        Actions.setTrackSourceParams({
          trackId: props.trackId,
          sourceTrackId: props.sourceTrackId,
          sourceTrackParams: { volume: 0 },
        })
      )
    }, [props.trackId, props.sourceTrackId]),
    toggleEditing = useCallback(
      () =>
        dispatch(
          Actions.editSourceTrack({
            trackId: props.trackId,
            sourceTrackEditing: props.offsetEditing ? null : props.sourceTrackId,
          })
        ),
      [props.offsetEditing, props.sourceTrackId]
    )
  return (
    <SidebarItem
      key={props.sourceTrackId}
      title={
        <TrackWrapper onDoubleClick={setVisible} loaded={props.sourceTrack.loaded}>
          <TrackHead>
            <TrackName selected={false}>
              <TrackNameInner>{props.sourceTrack.name}</TrackNameInner>
            </TrackName>
            <SoloButton onClick={handleMute}>M</SoloButton>
            <SoloButton onClick={handleSolo}>S</SoloButton>
            <OffsetValue onClick={toggleEditing} active={props.offsetEditing}>
              {getOffsetStr(props.params.offset) + 's'}
            </OffsetValue>
            <Icon onClick={removeTrackSource} asButton name="close-thin" />
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
    { visibleSourceTrack, sourceTrackEditing } = useSelector(
      (state) => state.live.tracks[props.trackId]
    ),
    source = useSelector((state) => Selectors.getSourceByTrackId(state, props.trackId)),
    getTrackIndex = useMemo(() => Selectors.makeGetTrackIndex(), []),
    trackIndex = useSelector((state) => getTrackIndex(state, props.trackId))

  const sourceTrackIds = _.keys(source?.sourceTracks),
    many = sourceTrackIds.length > 1,
    addSource = useAddSource(),
    handleClick = useCallback(() => addSource(props.trackId), [props.trackId])

  return (
    <SourcesWrapper>
      <SourcesBody>
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
                visible={visibleSourceTrack === sourceTrackId}
                offsetEditing={sourceTrackId === sourceTrackEditing}
              />
            )
          )
        })}
        <WideButton onClick={handleClick}>+ add source</WideButton>
      </SourcesBody>
    </SourcesWrapper>
  )
}

export default memo(SourceTracks)
