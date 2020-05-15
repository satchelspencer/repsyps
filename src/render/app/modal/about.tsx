import React, { memo } from 'react'
import electron from 'electron'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'
import { keyframes } from 'react-emotion'

import { version } from 'render/util/env'

import Icon from 'render/components/icon'

const rotate = keyframes`
  0% {
    transform:rotate(0deg);
  }
  100% {
    transform:rotate(360deg);
  }
`
export const Rotater = ctyled.div.extendSheet`
  & svg {
    animation: ${rotate} 40s linear infinite;
  transform-origin:center;
  }
`

const AboutWrapper = ctyled.div.styles({
  bg: true,
  border: true,
  rounded: true,
  padd: 3.5,
  column: true,
  gutter: 2,
  color: (c) => c.contrast(-0.2),
  align: 'center',
}).extendSheet`
  box-shadow:0 0 5px rgba(0,0,0,0.1);
`

const Title = ctyled.div.styles({
  size: (s) => s * 1.1,
})

const Credit = ctyled.div.styles({
  size: (s) => s * 0.85,
  color: (c) => c.contrast(-0.1),
})

const Moi = ctyled.div.class(active).styles({}).extend`
  text-decoration:underline;
`

function About() {
  return (
    <AboutWrapper>
      <Rotater>
        <Icon name="repsyps" scale={10} />
      </Rotater>
      <Title>REPSYPS v{version}</Title>
      <Credit>
        created by&nbsp;
        <Moi onClick={() => electron.shell.openExternalSync('https://elldev.com')}>
          satchel spencer
        </Moi>
      </Credit>
    </AboutWrapper>
  )
}

export default memo(About)
