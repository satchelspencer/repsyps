import React, { memo } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import Icon from 'render/components/icon'

const JogWrapper = ctyled.div.styles({
  width: '50%',
  height: '50%',
  bg: true,
  align: 'center',
  justify: 'center',
}).extendSheet`
  border-radius:50%;
  opacity:0.9;
  border:${({ size }) => size / 4}px solid ${({ color }) =>
  color.contrast(0.12).bq} !important;
`

export interface JogProps {
  value: number
  onChange: (newValue: number) => any
}

function Jog(props: JogProps) {
  return (
    <JogWrapper>
      <Icon name="record" />
    </JogWrapper>
  )
}

export default memo(Jog)
