import React from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { palette } from './theme'

export const SliderWrapper = ctyled.div.styles({
  flex: 1,
})

export const Value = ctyled.div
  .attrs<{ warn?: boolean }>({ warn: false })
  .styles({
    bg: true,
    border: true,
    bgColor: (c, { warn }) =>
      warn ? c.as(palette.yellow).contrast(-0.1) : c.contrast(0.5),
    width: 4,
    padd: 0.5,
    justify: 'center',
    align: 'center',
    rounded: true,
  })
