import React, { memo, HTMLAttributes } from 'react'
import _ from 'lodash'
import { active } from 'ctyled'

import icons from './modules.js'

interface IconProps {
  name: string
  asButton?: boolean
  disabled?: boolean
  styles?: any
}

const iconButtons = _.mapValues(icons, Icon => {
  return Icon.class(active)
    .attrs({ disabled: false })
    .styles({ hover: true }).extendSheet`
  opacity:0.7;
  &:hover{
    opacity:1;
  }
  ${(_, { disabled }) =>
    disabled &&
    `
    opacity:0.5;
    pointer-events:none;
  `}
`
})

const Icon = memo(
  ({ name, asButton, ...props }: IconProps & HTMLAttributes<SVGElement>) => {
    const El = !asButton ? icons[name] : iconButtons[name]
    return <El {...props} />
  }
)
Icon.displayName = 'Icon'
export default Icon
