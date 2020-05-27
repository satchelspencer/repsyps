import * as _ from 'lodash'
import ctyled, { inline } from 'ctyled'

import { palette } from 'render/components/theme'
import Button from 'render/components/button'
import { adder } from 'render/components/control-adder'

export const SliderWrapper = ctyled.div.styles({
  flex: 1,
})

export const ItemAdder = adder(
  ctyled.div.styles({
    align: 'center',
    flex: 1,
    gutter: 1,
  })
)

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

export const WideButton = Button.styles({
  color: (c) => c.nudge(0.05),
  justify: 'center',
  gutter: 1,
  alignSelf: 'stretch',
})

export const FillButton = WideButton.styles({
  flex: 1,
})

export const SelectableButton = WideButton.attrs<{
  selected: boolean
  compact?: boolean
}>({ selected: false, compact: false }).styles({
  color: (c, { selected }) => (selected ? c.nudge(0.1).contrast(0.1) : c),
  flex: (_, { compact }) => (compact ? 'none' : 1),
  alignSelf: 'stretch',
})

export const SidebarValue = Value.class(inline).styles({ height: 1.8 })

export const Horizontal = ctyled.div.styles({
  align: 'center',
  //justify: 'space-between',
  gutter: 1,
})

export const HeaderContent = Horizontal.styles({
  size: (s) => s * 1.1,
  gutter: 0.5,
})

export const FillMessage = ctyled.div.styles({
  justify: 'center',
  align: 'center',
  size: (s) => s * 1.1,
  color: (c) => c.contrast(-0.3),
}).extendSheet`
  position:absolute;
  top:0;
  left:0;
  width:100%;
  height:100%;
`

export const Status = ctyled.div
  .attrs<{
    err?: boolean
    link?: boolean
  }>({
    err: false,
    link: false,
  })
  .styles({ size: (s) => s * 0.85, align: 'center', gutter: 1 }).extendSheet`
${(_, { link }) =>
  link &&
  `
  text-decoration:underline;
  cursor:pointer;
  color:#70c4ffb3;
`}
${(_, { err }) =>
  err &&
  `
color:rgba(255,0,0,0.7)
`}

`
