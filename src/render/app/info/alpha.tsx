import React, { memo, useCallback } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import * as Actions from 'render/redux/actions'

import { SelectableButton, Horizontal } from 'render/components/misc'

export interface AlphaProps {
  sourceId: string | null
}

interface SetterProps {
  alpha: number
  text: string
  currentAlpha: number
  setAlpha: any
}

const Setter = (props: SetterProps) => {
  const handleClick = useCallback(() => props.setAlpha(props.alpha), [props.alpha])
  return (
    <SelectableButton selected={props.alpha === props.currentAlpha} onClick={handleClick}>
      {props.text}
    </SelectableButton>
  )
}

const Alpha = memo((props: AlphaProps) => {
  const alpha = useSelector((state) =>
      props.sourceId === null ? 1 : state.sources[props.sourceId].boundsAlpha
    ),
    dispatch = useDispatch(),
    setAlpha = useCallback(
      (value) => {
        props.sourceId &&
          dispatch(
            Actions.setSourceAlpha({
              sourceId: props.sourceId,
              boundsAlpha: value,
            })
          )
      },
      [props.sourceId, name]
    )

  return (
    <Horizontal>
      <Setter alpha={1 / 4} text="1/4x" currentAlpha={alpha} setAlpha={setAlpha} />
      <Setter alpha={1 / 2} text="1/2x" currentAlpha={alpha} setAlpha={setAlpha} />
      <Setter alpha={1} text="1x" currentAlpha={alpha} setAlpha={setAlpha} />
      <Setter alpha={2} text="2x" currentAlpha={alpha} setAlpha={setAlpha} />
      <Setter alpha={4} text="4x" currentAlpha={alpha} setAlpha={setAlpha} />
    </Horizontal>
  )
})

export default Alpha
