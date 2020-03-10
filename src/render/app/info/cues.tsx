import React, { memo, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled, { inline, active } from 'ctyled'
import { SortableContainer, SortableElement } from 'react-sortable-hoc'

import * as Types from 'render/util/types'
import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import { RATE } from 'render/util/audio'

import Icon from 'render/components/icon'
import { WideButton, HeaderContent } from 'render/components/misc'
import ControlAdder from 'render/components/control-adder'

import SidebarItem from './item'

const CueWrapper = ctyled.div
  .attrs<{ active?: boolean; next?: boolean }>({ active: false, next: false })
  .class(inline)
  .styles({
    align: 'center',
    padd: 1.5,
    justify: 'space-between',
    color: c => c.nudge(0.05),
    rounded: true,
    border: 1,
    height: 2,
    flex: 1,
    borderColor: c => c.contrast(-0.1),
  }).extend`
  padding-right:0px !important;
  background:${({ color }, { active, next }) =>
    active ? color.nudge(-0.2).bg : next ? color.nudge(-0.1).bg : color.bg};
`

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

const JumpButton = FullButton.styles({
  justify: 'space-between',
})

const JumpInner = ctyled.div.styles({
  align: 'center',
})

const CueNumber = ctyled.div.styles({
  size: s => s * 1.2,
}).extend`
  font-weight:bold;
`

const BehaviorWrapper = ctyled.div.styles({
  lined: true,
  border: 1,
  rounded: 1,
  borderColor: c => c.contrast(-0.1),
})

const CueBehavior = ctyled.div
  .class(active)
  .attrs<{ off?: boolean }>({ off: false })
  .styles({
    hover: true,
    align: 'center',
    padd: 1,
    justify: 'center',
    color: c => c.nudge(0.05),
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
  trackName: string
  children?: any
}

interface CueUsePickerProps extends CueProps {
  prop: keyof Types.TrackPlayback
  icon: string
}

const CueUsePicker = (props: CueUsePickerProps) => {
  const isUsed = props.cue.used.includes(props.prop),
    dispatch = useDispatch()
  return (
    <CueBehavior
      onClick={() => {
        dispatch(
          Actions.addCue({
            trackId: props.trackId,
            cue: {
              ...props.cue,
              used: isUsed
                ? _.without(props.cue.used, props.prop)
                : [...props.cue.used, props.prop],
            },
            index: props.cueIndex,
          })
        )
      }}
      off={!isUsed}
    >
      <Icon name={props.icon} />
    </CueBehavior>
  )
}

const startBehaviors: Types.CueStartBehavior[] = ['on-chunk', 'on-end', 'immediate'],
  endBehaviors: Types.CueEndBehavior[] = ['loop', 'next']

const Cue = SortableElement((xprops: any) => {
  const props = xprops as CueProps,
    dispatch = useDispatch()
  return (
    <CueH>
      <CueWrapper
        active={props.active}
        next={props.next}
        onClick={() =>
          dispatch(
            Actions.applyControl({
              control: {
                name: '',
                position: { x: 0, y: 0 },
                trackId: props.trackId,
                type: 'note',
                cueIndex: props.cueIndex,
              },
              value: 127,
              function: 'note-on',
            })
          )
        }
      >
        <CueTitle>
          <CueNumber>{props.cueIndex + 1}</CueNumber>
          <span>at {_.round(props.cue.playback.chunks[0] / RATE, 2)}s</span>
        </CueTitle>
        <ControlAdder
          name={`Cue ${props.cueIndex + 1}: ${props.trackName}`}
          params={{
            cueIndex: props.cueIndex,
            trackId: props.trackId,
          }}
          type="note"
        />
      </CueWrapper>
      <BehaviorWrapper>
        <CueUsePicker {...props} icon="volume" prop="sourceTracksParams" />
        <CueUsePicker {...props} icon="spectrum" prop="filter" />
        <CueBehavior
          onClick={() => {
            const nextBehavior =
              startBehaviors[
                (startBehaviors.indexOf(props.cue.startBehavior) + 1) %
                  startBehaviors.length
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
          }}
        >
          <Icon name={props.cue.startBehavior} />
        </CueBehavior>
        <CueBehavior
          onClick={() => {
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
          }}
        >
          <Icon name={props.cue.endBehavior} />
        </CueBehavior>
      </BehaviorWrapper>
      <Icon
        asButton
        name="close"
        onClick={() =>
          dispatch(Actions.deleteCue({ trackId: props.trackId, index: props.cueIndex }))
        }
      />
    </CueH>
  )
})

const Cues = memo((props: CuesProps) => {
  const { playback, cues, cueIndex, nextCueIndex } = useSelector(
      state => state.live.tracks[props.trackId]
    ),
    { name } = useSelector(state => state.sources[props.trackId]),
    dispatch = useDispatch(),
    handleAddCue = useCallback(() => {
      dispatch(
        Actions.addCue({
          trackId: props.trackId,
          cue: {
            playback: {
              ...playback,
              chunkIndex: -1,
              playing: true,
            },
            used: [
              'sourceTracksParams',
              'filter',
              'chunks',
              'playing',
              'chunkIndex',
              'aperiodic',
            ],
            startBehavior: 'immediate',
            endBehavior: 'loop',
          },
        })
      )
    }, [props.trackId, playback, name]),
    hasCues = !!cues.length,
    atStart = playback.playing && cueIndex === 0,
    atEnd = playback.playing && cueIndex === cues.length - 1,
    canPrev = atStart || cueIndex > 0,
    canNext = atEnd || (cueIndex !== -1 && cueIndex < cues.length - 1)

  return (
    <>
      <SidebarItem
        open={hasCues}
        onSetOpen={() => {}}
        title={
          <>
            <HeaderContent>
              <Icon name="cue" styles={{ size: s => s * 1.1 }} />
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
            onClick={() => {
              if (!canPrev) return
              dispatch(
                Actions.applyControl({
                  control: {
                    name: '',
                    position: { x: 0, y: 0 },
                    trackId: props.trackId,
                    type: 'note',
                    cueStep: -1,
                  },
                  value: 127,
                  function: 'note-on',
                })
              )
            }}
          >
            <JumpInner>
              <Icon name="prev" />
              &nbsp;{atStart ? 'Stop' : 'Prev'}
            </JumpInner>
            <ControlAdder
              name={`Prev: ${name}`}
              params={{
                trackId: props.trackId,
                cueStep: -1,
              }}
              type="note"
            />
          </JumpButton>
          <JumpButton
            allowClick
            onClick={() => {
              dispatch(
                Actions.applyControl({
                  control: {
                    name: '',
                    position: { x: 0, y: 0 },
                    trackId: props.trackId,
                    type: 'note',
                    cueStep: 1,
                  },
                  value: 127,
                  function: 'note-on',
                })
              )
            }}
          >
            <JumpInner>
              <Icon name="next" />
              &nbsp;{canNext ? (atEnd ? 'End' : 'Next') : 'Start'}
            </JumpInner>
            <ControlAdder
              name={`Next: ${name}`}
              params={{
                trackId: props.trackId,
                cueStep: 1,
              }}
              type="note"
            />
          </JumpButton>
        </CueH>
        <CuesList
          axis="y"
          lockAxis="y"
          lockToContainerEdges
          onSortEnd={({ oldIndex, newIndex }) => {
            dispatch(
              Actions.reorderCue({
                trackId: props.trackId,
                oldIndex,
                newIndex,
              })
            )
          }}
          distance={5}
          transitionDuration={0}
        >
          {cues.map((cue, thisCueIndex) => (
            <Cue
              index={thisCueIndex}
              key={thisCueIndex}
              trackId={props.trackId}
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
