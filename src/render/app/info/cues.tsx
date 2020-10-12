import React, { memo, useMemo, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled, { inline, active } from 'ctyled'
import { SortableContainer, SortableElement } from 'react-sortable-hoc'

import * as Types from 'render/util/types'
import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import { RATE } from 'render/util/audio'

import Icon from 'render/components/icon'
import { WideButton, HeaderContent } from 'render/components/misc'
import { adder } from 'render/components/control-adder'

import SidebarItem from 'render/components/item'

const CueWrapper = adder(ctyled.div
  .attrs<{ active?: boolean; next?: boolean }>({ active: false, next: false })
  .class(inline)
  .styles({
    align: 'center',
    padd: 1.5,
    justify: 'space-between',
    color: (c) => c.nudge(0.05),
    rounded: true,
    border: 1,
    height: 2,
    flex: 1,
    borderColor: (c) => c.contrast(-0.1),
  }).extend`
  padding-right:0px !important;
  background:${({ color }, { active, next }) =>
    active ? color.nudge(-0.2).bg : next ? color.nudge(-0.1).bg : color.bg};
`)

const CuesListWrapper = ctyled.div.styles({
  column: true,
  gutter: true,
})

const CuesList = SortableContainer(CuesListWrapper)

const CueH = ctyled.div.styles({
  gutter: 1,
  align: 'center',
}).extendSheet`
  font-size:${({ size }) => size}px;
`

const CueTitle = ctyled.div.styles({
  align: 'center',
  gutter: 1,
})

const FullButton = WideButton.styles({
  flex: 1,
})

const JumpButton = adder(
  FullButton.styles({
    align: 'center',
  })
)

const CueNumber = ctyled.div.styles({
  size: (s) => s * 1.2,
}).extend`
  font-weight:bold;
`

const BehaviorWrapper = ctyled.div.styles({
  lined: true,
  border: 1,
  rounded: 1,
  borderColor: (c) => c.contrast(-0.1),
})

const CueBehavior = ctyled.div
  .class(active)
  .attrs<{ off?: boolean }>({ off: false })
  .styles({
    hover: true,
    align: 'center',
    padd: 1,
    justify: 'center',
    color: (c) => c.nudge(0.05),
    height: 1.8,
    bg: true,
  }).extend`
  ${(_, { off }) =>
    off &&
    `
    opacity:0.5;
  `}
`

export interface CuesProps {
  trackId: string
}

interface CueProps {
  cue: Types.Cue
  cueIndex: number
  active: boolean
  next: boolean
  trackId: string
  trackIndex: number
  trackName: string
  children?: any
}

interface CueUsePickerProps extends CueProps {
  props: (keyof Types.TrackPlayback)[]
  icon: string
}

const CueUsePicker = (props: CueUsePickerProps) => {
  const isUsed = _.every(props.props, (prop) => props.cue.used.includes(prop)),
    dispatch = useDispatch(),
    handleClick = useCallback(() => {
      dispatch(
        Actions.addCue({
          trackId: props.trackId,
          cue: {
            ...props.cue,
            used: isUsed
              ? _.without(props.cue.used, ...props.props)
              : [...props.cue.used, ...props.props],
          },
          index: props.cueIndex,
        })
      )
    }, [props.trackId, props.cueIndex, props.cue, props.props])
  return (
    <CueBehavior onClick={handleClick} off={!isUsed}>
      <Icon name={props.icon} />
    </CueBehavior>
  )
}

const startBehaviors: Types.CueStartBehavior[] = ['on-chunk', 'on-end', 'immediate'],
  endBehaviors: Types.CueEndBehavior[] = ['loop', 'next', 'stop']

const Cue = SortableElement((xprops: any) => {
  const props = xprops as CueProps,
    dispatch = useDispatch(),
    cueParams = useMemo(
      () => ({ cueIndex: props.cueIndex, trackIndex: props.trackIndex, invert: true }),
      [props.cueIndex, props.trackIndex]
    ),
    handleSetCue = useCallback(
      () =>
        dispatch(
          Actions.setTrackCue({
            trackId: props.trackId,
            cueIndex: props.cueIndex,
          })
        ),
      [props.trackId, props.cueIndex]
    ),
    setStartBehavior = useCallback(() => {
      const nextBehavior =
        startBehaviors[
          (startBehaviors.indexOf(props.cue.startBehavior) + 1) % startBehaviors.length
        ]
      dispatch(
        Actions.addCue({
          trackId: props.trackId,
          cue: {
            ...props.cue,
            startBehavior: nextBehavior,
          },
          index: props.cueIndex,
        })
      )
    }, [props.cue, props.trackId, props.cueIndex]),
    setEndBehavior = useCallback(() => {
      const nextBehavior =
        endBehaviors[
          (endBehaviors.indexOf(props.cue.endBehavior) + 1) % endBehaviors.length
        ]
      dispatch(
        Actions.addCue({
          trackId: props.trackId,
          cue: {
            ...props.cue,
            endBehavior: nextBehavior,
          },
          index: props.cueIndex,
        })
      )
    }, [props.cue, props.trackId, props.cueIndex]),
    removeCue = useCallback(
      () =>
        dispatch(Actions.deleteCue({ trackId: props.trackId, index: props.cueIndex })),
      [props.trackId, props.cueIndex]
    ),
    playback = useSelector((state) => state.live.tracks[props.trackId].playback),
    updateCue = useCallback(() => {
      dispatch(
        Actions.addCue({
          trackId: props.trackId,
          cue: {
            ...props.cue,
            playback: {
              chunkIndex: -1,
              playing: true,
            },
          },
          index: props.cueIndex,
        })
      )
    }, [playback, props.trackId])

  return (
    <CueH>
      <CueWrapper
        params={cueParams}
        active={props.active}
        next={props.next}
        onClick={handleSetCue}
      >
        <CueTitle>
          <CueNumber>{props.cueIndex + 1}</CueNumber>
          <span>at {_.round(props.cue.playback.chunks[0] / RATE, 2)}s</span>
        </CueTitle>
      </CueWrapper>

      <BehaviorWrapper>
        <CueUsePicker {...props} icon="volume" props={['sourceTracksParams', 'volume']} />
        <CueUsePicker {...props} icon="spectrum" props={['filter']} />
        <CueBehavior onClick={setStartBehavior}>
          <Icon name={props.cue.startBehavior} />
        </CueBehavior>
        <CueBehavior onClick={setEndBehavior}>
          <Icon name={props.cue.endBehavior} />
        </CueBehavior>
      </BehaviorWrapper>
      <BehaviorWrapper onClick={updateCue}>
        <CueBehavior>
          <Icon name="crosshairs" />
        </CueBehavior>
      </BehaviorWrapper>
      <Icon asButton name="close-thin" onClick={removeCue} />
    </CueH>
  )
})

const Cues = memo((props: CuesProps) => {
  const { playback, cues, cueIndex, nextCueIndex, sourceId } = useSelector(
      (state) => state.live.tracks[props.trackId]
    ),
    getTrackIndex = useMemo(() => Selectors.makeGetTrackIndex(), []),
    trackIndex = useSelector((state) => getTrackIndex(state, props.trackId)),
    name = useSelector((state) =>
      sourceId === null ? null : state.sources[sourceId]?.name
    ),
    dispatch = useDispatch(),
    handleAddCue = useCallback(() => {
      dispatch(
        Actions.addCue({
          trackId: props.trackId,
          cue: {
            playback: {
              chunkIndex: -1,
              playing: true,
            },
            startBehavior: 'immediate',
            endBehavior: playback.loop ? 'loop' : 'stop',
          },
        })
      )
    }, [props.trackId, playback, name]),
    hasCues = !!cues.length,
    atStart = playback.playing && cueIndex === 0,
    atEnd = playback.playing && cueIndex === cues.length - 1,
    canPrev = atStart || cueIndex > 0,
    canNext = atEnd || (cueIndex !== -1 && cueIndex < cues.length - 1),
    pausedOnCue = !playback.playing && cueIndex !== -1

  const handleStepBack = useCallback(() => {
      if (!canPrev) return
      dispatch(
        Actions.stepTrackCue({
          trackId: props.trackId,
          cueStep: -1,
        })
      )
    }, [props.trackId, canPrev]),
    stepBackParams = useMemo(
      () => ({
        trackIndex,
        cueStep: -1,
        invert: true,
      }),
      [trackIndex]
    ),
    handleStepForward = useCallback(() => {
      dispatch(
        Actions.stepTrackCue({
          trackId: props.trackId,
          cueStep: 1,
        })
      )
    }, [props.trackId]),
    stepForwardParams = useMemo(
      () => ({
        trackIndex,
        cueStep: 1,
        invert: true,
      }),
      [trackIndex]
    ),
    handleSortEnd = useCallback(
      ({ oldIndex, newIndex }) => {
        dispatch(
          Actions.reorderCue({
            trackId: props.trackId,
            oldIndex,
            newIndex,
          })
        )
      },
      [props.trackId]
    )

  return (
    <>
      <SidebarItem
        open={hasCues}
        title={
          <>
            <HeaderContent>
              <Icon name="cue" scale={1.1} />
              <span>&nbsp;Playback Cues</span>
            </HeaderContent>
            <FullButton onClick={handleAddCue}>
              <Icon name="add" />
              &nbsp; Add Cue
            </FullButton>
          </>
        }
      >
        <CueH>
          <HeaderContent>Step Cue</HeaderContent>
          <JumpButton
            disabled={!canPrev}
            allowClick
            onClick={handleStepBack}
            params={stepBackParams}
          >
            <Icon name="prev" />
            &nbsp;{atStart ? 'Stop' : 'Prev'}
          </JumpButton>
          <JumpButton allowClick onClick={handleStepForward} params={stepForwardParams}>
            <Icon name="next" />
            &nbsp;
            {pausedOnCue ? 'Play' : canNext ? (atEnd ? 'End' : 'Next') : 'Start'}
          </JumpButton>
        </CueH>
        <CuesList
          axis="y"
          lockAxis="y"
          lockToContainerEdges
          onSortEnd={handleSortEnd}
          distance={5}
          transitionDuration={0}
        >
          {cues.map((cue, thisCueIndex) => (
            <Cue
              index={thisCueIndex}
              key={thisCueIndex}
              trackId={props.trackId}
              trackIndex={trackIndex}
              trackName={name}
              cue={cue}
              cueIndex={thisCueIndex}
              active={thisCueIndex === cueIndex}
              next={nextCueIndex === thisCueIndex}
            />
          ))}
        </CuesList>
      </SidebarItem>
    </>
  )
})

export default Cues
