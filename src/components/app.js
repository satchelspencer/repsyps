import React from 'react'
import ctyled from 'ctyled'

const But = ctyled.button.styles({
  bg: true,
  color: c => c.contrast(-0.1),
  size: s => s * 2,
})

export default () => <But>yeha</But>
