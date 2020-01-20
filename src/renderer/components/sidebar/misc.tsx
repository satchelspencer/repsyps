import * as _ from 'lodash'
import ctyled, { inline } from 'ctyled'

import Button from 'renderer/components/button'
import { Value } from '../misc'

export const WideButton = Button.styles({
  color: c => c.nudge(0.05),
  justify: 'center',
  gutter: 1
})

export const SidebarValue = Value.class(inline).extend`
  margin-top: 1px;
`

export const Horizontal = ctyled.div.styles({
  align: 'center',
  //justify: 'space-between',
  gutter: 0.5,
})

export const HeaderContent = Horizontal.styles({
  size: s => s * 1.1,
})