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
  .attrs({ active: false })
  .class(inline)
  .styles({
    align: 'center',
    padd: 1.5,
    justify: 'space-between',
    color: c => c.nudge(0.05),
    rounded: true,
    flex: 1,
    border: 1,
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

export interface CuesProps {
  trackId: string
}

interface CueProps {
  cue: Types.Cue
  cueIndex: number
  active: boolean
  trackId: string
}

const Cue = SortableElement((props: CueProps) => {
  const dispatch = useDispatch()
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
          Cue {props.cueIndex + 1} at {_.round(props.cue.chunks[0] / RATE, 2)}s
        </CueTitle>
        <ControlAdder
          name={`Cue ${props.cueIndex + 1}: ${name}`}
          params={{
            cueIndex: props.cueIndex,
            trackId: props.trackId,
          }}
          type="note"
        />
      </CueWrapper>
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
          cues: (track && track.cues) || [],
          activeCueIndex: Selectors.getActiveCueIndex(track),
        }
      },
      [props.trackId]
    ),
    { name, chunks, cues, activeCueIndex } = useMappedState(getMappedState),
    dispatch = useDispatch(),
    handleAddCue = useCallback(() => {
      dispatch(
        Actions.addCue({
          trackId: props.trackId,
          cue: {
            chunks,
            chunkIndex: -1,
            playing: true,
          },
        })
      )
    }, [props.trackId, chunks, name]),
    canAdd = chunks[1],
    hasCues = !!cues.length,
    canPrev = activeCueIndex > 0,
    canNext = activeCueIndex !== -1 && activeCueIndex < cues.length - 1

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
              if (canPrev)
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
              &nbsp;Prev
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
            disabled={!canNext}
            allowClick
            onClick={() => {
              if (canNext)
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
              &nbsp;Next
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
