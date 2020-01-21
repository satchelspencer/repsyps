import React, { useCallback, useMemo } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'
import ctyled, { inline } from 'ctyled'

import * as Types from 'lib/types'
import getImpulses from 'lib/impulse-detect'
import * as Actions from 'render/redux/actions'
import Icon from 'render/components/icon'
import SidebarItem from './item'
import { WideButton, SidebarValue, HeaderContent } from 'render/components/misc'
import inferTimeBase from 'lib/infer-timebase'
import { RATE } from 'lib/audio'

export interface BoundsControlProps {
  sourceId: string
}

export default function BoundsControl(props: BoundsControlProps) {
  const getMappedState = useCallback(
      (state: Types.State) => ({
        source: props.sourceId && state.sources[props.sourceId],
      }),
      [props.sourceId]
    ),
    { source } = useMappedState(getMappedState),
    dispatch = useDispatch(),
    impulses = useMemo(() => getImpulses(source.channels.getChannelData(1)), [
      source.channels,
    ]),
    hasTimeBase = !!source.bounds.length,
    cstart = source.playback.chunks[0],
    clength = source.playback.chunks[1],
    inferLR = useCallback(() => {
      if (!clength) return
      dispatch(
        Actions.setSourceBounds({
          sourceId: props.sourceId,
          bounds: inferTimeBase(source.playback, impulses),
        })
      )
    }, [source.playback, impulses]),
    inferLeft = useCallback(() => {
      if (!clength) return
      const endPoint = cstart + clength,
        inferredBounds = inferTimeBase(source.playback, impulses).filter(
          bound => bound <= endPoint
        ),
        existingBounds = source.bounds.filter(bound => bound > endPoint)

      dispatch(
        Actions.setSourceBounds({
          sourceId: props.sourceId,
          bounds: _.sortBy([...inferredBounds, ...existingBounds]),
        })
      )
    }, [source.playback, source.bounds, impulses]),
    inferRight = useCallback(() => {
      if (!clength) return
      const startPoint = cstart,
        inferredBounds = inferTimeBase(source.playback, impulses).filter(
          bound => bound >= startPoint
        ),
        existingBounds = source.bounds.filter(bound => bound < startPoint)

      dispatch(
        Actions.setSourceBounds({
          sourceId: props.sourceId,
          bounds: _.sortBy([...inferredBounds, ...existingBounds]),
        })
      )
    }, [source.playback, source.bounds, impulses]),
    avgBar = useMemo(() => {
      let sum = 0
      source.bounds.forEach((bound, i) => {
        const next = source.bounds[i + 1]
        if (next) sum += next - bound
      })
      return sum / (source.bounds.length - 1)
    }, [source.bounds])

  return (
    <SidebarItem
      open={source.editing}
      onSetOpen={open =>
        dispatch(Actions.editSource({ sourceId: props.sourceId, edit: open }))
      }
      title={
        <HeaderContent>
          <Icon name="timer" styles={{ size: s => s * 1.2 }} />
          <span>Time Divisions:</span>
          <SidebarValue warn={!hasTimeBase} styles={{ size: s => s * 0.8 }}>
            {hasTimeBase ? _.round(60 / (avgBar / RATE), 0)+'/m' : '??'}
          </SidebarValue>
        </HeaderContent>
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
    </SidebarItem>
  )
}
