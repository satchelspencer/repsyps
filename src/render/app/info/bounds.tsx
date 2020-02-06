import React, { memo, useCallback, useMemo } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'
import ctyled, { inline, active } from 'ctyled'

import * as Types from 'render/util/types'
import getImpulses from 'render/util/impulse-detect'
import * as Actions from 'render/redux/actions'
import Icon from 'render/components/icon'
import SidebarItem from './item'
import { WideButton, SidebarValue, HeaderContent } from 'render/components/misc'
import inferTimeBase from 'render/util/infer-timebase'
import { RATE } from 'render/util/audio'
import { useSelection } from 'render/components/selection'
import { getBuffer } from 'render/redux/buffers'

export interface BoundsControlProps {
  sourceId: string
}

const EditLink = ctyled.div
  .class(inline)
  .class(active)
  .styles({
    hover: true,
    padd: 1,
    bg: false,
  }).extend`
  text-decoration:underline;
`

const BoundsControl = memo((props: BoundsControlProps) => {
  const getMappedState = useCallback(
      (state: Types.State) => {
        const source = props.sourceId && state.sources[props.sourceId]
        return {
          chunks: source && source.playback.chunks,
          bounds: source && source.bounds,
          editing: source && source.editing,
        }
      },
      [props.sourceId]
    ),
    { chunks, bounds, editing } = useMappedState(getMappedState),
    channels = getBuffer(props.sourceId),
    dispatch = useDispatch(),
    { isSelecting, getSelection } = useSelection(),
    impulses = useMemo(() => getImpulses(channels[0], props.sourceId), [
      channels,
      props.sourceId,
    ]),
    hasTimeBase = !!bounds.length,
    cstart = chunks[0],
    clength = chunks[1],
    inferLR = useCallback(() => {
      if (!clength) return
      dispatch(
        Actions.setSourceBounds({
          sourceId: props.sourceId,
          bounds: inferTimeBase(chunks, impulses),
        })
      )
    }, [chunks, impulses]),
    inferLeft = useCallback(() => {
      if (!clength) return
      const endPoint = cstart + clength,
        inferredBounds = inferTimeBase(chunks, impulses).filter(
          bound => bound <= endPoint
        ),
        existingBounds = bounds.filter(bound => bound > endPoint)

      dispatch(
        Actions.setSourceBounds({
          sourceId: props.sourceId,
          bounds: _.sortBy([...inferredBounds, ...existingBounds]),
        })
      )
    }, [chunks, bounds, impulses]),
    inferRight = useCallback(() => {
      if (!clength) return
      const startPoint = cstart,
        inferredBounds = inferTimeBase(chunks, impulses).filter(
          bound => bound >= startPoint
        ),
        existingBounds = bounds.filter(bound => bound < startPoint)

      dispatch(
        Actions.setSourceBounds({
          sourceId: props.sourceId,
          bounds: _.sortBy([...inferredBounds, ...existingBounds]),
        })
      )
    }, [chunks, bounds, impulses]),
    avgBar = useMemo(() => {
      let sum = 0
      bounds.forEach((bound, i) => {
        const next = bounds[i + 1]
        if (next) sum += next - bound
      })
      return sum / (bounds.length - 1)
    }, [bounds]),
    handleSelect = useCallback(async () => {
      if (!isSelecting) {
        console.log()
        const id = await getSelection()
        dispatch(
          Actions.copySourceBounds({
            src: id,
            dest: props.sourceId,
          })
        )
      }
    }, [isSelecting, getSelection, props.sourceId])

  return (
    <SidebarItem
      open={editing}
      onSetOpen={open =>
        dispatch(Actions.editSource({ sourceId: props.sourceId, edit: open }))
      }
      title={
        <>
          <HeaderContent>
            <Icon name="timer" styles={{ size: s => s * 1.2 }} />
            <span>Time Divisions:</span>
            <SidebarValue warn={!hasTimeBase} styles={{ size: s => s * 1 }}>
              {hasTimeBase ? _.round(60 / (avgBar / RATE), 0) + '/m' : '??'}
            </SidebarValue>
          </HeaderContent>
          <WideButton styles={{ flex: 1 }}>{editing ? 'Done' : 'Edit'}</WideButton>
        </>
      }
    >
      <WideButton
        onClick={() =>
          dispatch(
            Actions.setSourceBounds({
              sourceId: props.sourceId,
              bounds: [],
            })
          )
        }
      >
        <Icon name="close-thin" />
        <span>reset divisions</span>
      </WideButton>
      <WideButton onClick={inferLR}>
        <Icon name="cheveron-left" />
        <span>infer from selection</span>
        <Icon name="cheveron-right" />
      </WideButton>
      <WideButton onClick={inferLeft}>
        <Icon name="cheveron-left" />
        <span>infer selection left </span>
      </WideButton>
      <WideButton onClick={inferRight}>
        <span>infer selection right</span>
        <Icon name="cheveron-right" />
      </WideButton>
      <WideButton onClick={handleSelect}>
        <Icon name="eyedropper" />
        <span>{isSelecting ? 'select a track...' : 'select from track'}</span>
      </WideButton>
    </SidebarItem>
  )
})

export default BoundsControl
