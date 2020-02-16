import React, { memo, useCallback } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'
import ctyled, { inline } from 'ctyled'
import { SortableContainer, SortableElement } from 'react-sortable-hoc'

import * as Types from 'render/util/types'
import * as Actions from 'render/redux/actions'
import * as Selectors from 'render/redux/selectors'
import { RATE } from 'render/util/audio'

import Icon from 'render/components/icon'
import { WideButton, HeaderContent } from 'render/components/misc'
import ControlAdder from 'render/components/control-adder'

import SidebarItem from './item'

const CueWrapper = ctyled.div
  .attrs<{ active?: boolean }>({ active: false })
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
  background:${({ color }, { active }) => (active ? color.nudge(-0.2).bg : color.bg)};
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

const CueBehavior = CueWrapper.styles({
  flex: 'none',
  width: 2,
  align: 'center',
  justify: 'center',
})

export interface CuesProps {
  trackId: string
}

interface CueProps {
  cue: Types.Cue
  cueIndex: number
  active: boolean
  trackId: string
  trackName: string
  children?: any
}

const startBehaviors: Types.CueStartBehavior[] = ['on-chunk', 'immediate'],
  endBehaviors: Types.CueEndBehavior[] = ['loop', 'next']

const Cue = SortableElement((xprops: any) => {
  const props = xprops as CueProps,
    dispatch = useDispatch()
  return (
    <CueH>
      <CueWrapper active={props.active}>
        <CueTitle
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
          <CueNumber>{props.cueIndex + 1}</CueNumber>
          <span>at {_.round(props.cue.chunks[0] / RATE, 2)}s</span>
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
  const getMappedState = useCallback(
      (state: Types.State) => {
        const track = state.tracks[props.trackId]
        return {
          name: track && track.name,
          chunks: track && track.playback.chunks,
          playing: track && track.playback.playing,
          cues: (track && track.cues) || [],
          activeCueIndex: track.cueIndex,
        }
      },
      [props.trackId]
    ),
    { name, chunks, playing, cues, activeCueIndex } = useMappedState(getMappedState),
    dispatch = useDispatch(),
    handleAddCue = useCallback(() => {
      dispatch(
        Actions.addCue({
          trackId: props.trackId,
          cue: {
            chunks,
            startBehavior: 'immediate',
            endBehavior: 'loop',
          },
        })
      )
    }, [props.trackId, chunks, name]),
    canAdd = chunks[1],
    hasCues = !!cues.length,
    atStart = playing && activeCueIndex === 0,
    atEnd = playing && activeCueIndex === cues.length - 1,
    canPrev = atStart || activeCueIndex > 0,
    canNext = atEnd || (activeCueIndex !== -1 && activeCueIndex < cues.length - 1)

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
            <FullButton disabled={!canAdd} onClick={handleAddCue}>
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
          {cues.map((cue, cueIndex) => (
            <Cue
              index={cueIndex}
              key={cueIndex}
              trackId={props.trackId}
              trackName={name}
              cue={cue}
              cueIndex={cueIndex}
              active={activeCueIndex === cueIndex}
            />
          ))}
        </CuesList>
      </SidebarItem>
    </>
  )
})

export default Cues
