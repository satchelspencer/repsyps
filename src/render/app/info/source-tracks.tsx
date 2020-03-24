import React, { memo, useMemo, useRef, useEffect } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import { addSource } from 'render/util/add-track'

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

const TrackWrapper = ctyled.div.styles({
  column: true,
  flex: 1,
  padd: 0.75,
  bg: true,
  color: c => c.nudge(0.05),
  rounded: true,
  border: true,
  borderColor: c => c.contrast(-0.1),
})

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

export interface TrackVolumeProps {
  trackId: string
}

const SourceTracks = (props: TrackVolumeProps) => {
  const sourceTracksParams = useSelector(
      state => state.live.tracks[props.trackId].playback.sourceTracksParams
    ),
    visibleSourceTrackId = useSelector(
      state => state.live.tracks[props.trackId].visibleSourceTrack
    ),
    source = useSelector(state => state.sources[props.trackId]),
    getTrackIndex = useMemo(() => Selectors.makeGetTrackIndex(), []),
    trackIndex = useSelector(state => getTrackIndex(state, props.trackId)),
    dispatch = useDispatch()

  const input = useRef(null)
  useEffect(() => {
    input.current = document.createElement('input')
    input.current.type = 'file'
    input.current.onchange = e => {
      const { files } = input.current
      addSource(props.trackId, files[0].path, dispatch)
      input.current.value = ''
    }
  }, [props.trackId])

  const sourceTrackIds = _.keys(source.sourceTracks)

  return (
    <TracksWrapper>
      {sourceTrackIds.map((sourceTrackId, sourceTrackIndex) => {
        const sourceTrackParams = sourceTracksParams[sourceTrackId],
          { name } = source.sourceTracks[sourceTrackId]
        return (
          <SidebarItem
            key={sourceTrackId}
            title={
              <TrackWrapper>
                <TrackHead>
                  <Icon name="wave" styles={{ size: s => s * 1.75 }} />
                  {sourceTrackIds.length > 1 && (
                    <Icon
                      asButton
                      name={visibleSourceTrackId === sourceTrackId ? 'show' : 'hide'}
                      onClick={() =>
                        dispatch(
                          Actions.setVisibleSourceTrack({
                            trackId: props.trackId,
                            visibleSourceTrack: sourceTrackId,
                          })
                        )
                      }
                      styles={{ size: s => s * 1.2 }}
                    />
                  )}
                  <TrackName selected={false}>
                    <TrackNameInner>{name}</TrackNameInner>
                  </TrackName>
                  {sourceTrackId !== props.trackId && (
                    <Icon
                      onClick={() =>
                        dispatch(
                          Actions.removeTrackSource({
                            sourceId: props.trackId,
                            sourceTrackId: sourceTrackId,
                          })
                        )
                      }
                      asButton
                      name="close-thin"
                    />
                  )}
                </TrackHead>
                <TrackH
                  params={{
                    trackIndex,
                    sourceTrackIndex,
                    sourceTrackProp: 'volume',
                  }}
                >
                  <Volume
                    volume={sourceTrackParams.volume}
                    onChange={v =>
                      dispatch(
                        Actions.setTrackSourceParams({
                          trackId: props.trackId,
                          sourceTrackId,
                          sourceTrackParams: { volume: v },
                        })
                      )
                    }
                  />
                </TrackH>
              </TrackWrapper>
            }
          />
        )
      })}
      <WideButton onClick={() => input.current.click()}>+ add source</WideButton>
    </TracksWrapper>
  )
}

export default memo(SourceTracks)
