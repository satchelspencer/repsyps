import React from 'react'
import { keyframes } from 'react-emotion'
import ctyled from 'ctyled'

import Icon from './icon'

const rotate = keyframes`
  0% {
    transform:rotate(0deg);
  }
  100% {
    transform:rotate(-360deg);
  }
`
export const Rotater = ctyled.div.styles({ size: (s) => s * 0.7 }).extendSheet`
  & svg {
    animation: ${rotate} 2s linear infinite;
  transform-origin:center;
  }
`
export default function Spinner() {
  return (
    <Rotater>
      <Icon scale={1.2} name="spinner" />
    </Rotater>
  )
}
