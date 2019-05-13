import React from 'react'

import ctyled, { inline, active } from 'ctyled'

const NonIndexButton = props => {
  return <div {...props} tabIndex="-1" />
}

const StyledButton = ctyled(NonIndexButton)
  .class(inline)
  .class(active)
  .attrs<{ compact?: boolean; inline?: boolean }>({ compact: false, inline: false })
  .styles({
    color: c => c.nudge(0.2),
    padd: (p, { compact }) => (compact ? 0.5 : 1),
    border: true,
    hover: true,
    align: 'center',
    gutter: 0.5,
    alignSelf: (_, { inline }) => (inline ? 'flex-start' : undefined),
    size: (s, { inline }) => (inline ? s * 0.9 : s),
  }).extendSheet`
    font-size:inherit;
  `

export default StyledButton
