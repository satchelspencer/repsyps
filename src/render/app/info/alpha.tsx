import React, { memo, useCallback } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'

import Icon from 'render/components/icon'
import { HeaderContent, SelectableButton } from 'render/components/misc'

import SidebarItem from 'render/components/item'

export interface AlphaProps {
  trackId: string
}

interface SetterProps {
  alpha: number
  text: string
  currentAlpha: number
  setAlpha: any
}

const Setter = (props: SetterProps) => {
  return (
    <SelectableButton
      selected={props.alpha === props.currentAlpha}
      onClick={() => props.setAlpha(props.alpha)}
    >
      {props.text}
    </SelectableButton>
  )
}

const Alpha = memo((props: AlphaProps) => {
  const alpha = useSelector(state => state.live.tracks[props.trackId].playback.alpha),
    dispatch = useDispatch(),
    setAlpha = useCallback(
      value => {
        dispatch(
          Actions.setTrackPlayback({
            trackId: props.trackId,
            playback: { alpha: value },
          })
        )
      },
      [props.trackId, name]
    )

  return (
    <SidebarItem
      title={
        <>
          <HeaderContent>
            <Icon name="meter" scale={1.3} />
            <span>&nbsp;Speed</span>
          </HeaderContent>
          <Setter alpha={1 / 4} text="1/4x" currentAlpha={alpha} setAlpha={setAlpha} />
          <Setter alpha={1 / 2} text="1/2x" currentAlpha={alpha} setAlpha={setAlpha} />
          <Setter alpha={1} text="1x" currentAlpha={alpha} setAlpha={setAlpha} />
          <Setter alpha={2} text="2x" currentAlpha={alpha} setAlpha={setAlpha} />
          <Setter alpha={4} text="4x" currentAlpha={alpha} setAlpha={setAlpha} />
        </>
      }
    />
  )
})

export default Alpha
