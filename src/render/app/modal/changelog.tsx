import React, { memo } from 'react'
import electron from 'electron'
import * as _ from 'lodash'
import ctyled, { inline } from 'ctyled'

import Icon from 'render/components/icon'
import { Status } from 'render/components/misc'
import * as env from 'render/util/env'

const ChangeWrapper = ctyled.div.styles({
  bg: true,
  border: true,
  rounded: true,
  padd: 3.5,
  column: true,
  gutter: 2,
  width: 28,
  color: (c) => c.contrast(-0.2),
}).extendSheet`
  box-shadow:0 0 5px rgba(0,0,0,0.1);
`

const InlineStatus = Status.class(inline).styles({ size: (s) => s })

const Title = ctyled.div.styles({
  size: (s) => s * 1.2,
}).extendInline`
  font-weight:bold;
`

const ChangeList = ctyled.ul.styles({
  column: true,
  gutter: 1,
}).extendSheet`
  padding-left:${({ size }) => size * 1.4}px;
`

function ChangeLog() {
  return (
    <ChangeWrapper>
      <Title>New in REPSYPS v{env.version}</Title>
      <ChangeList>
        <li>
          added <b>library browser</b>, for saved .syp files
        </li>
        <li>sort library by temp difference, name or date</li>
        <li>import whole projects or single scenes / tracks</li>
        <li>
          support for{' '}
          <InlineStatus
            link
            onClick={() =>
              electron.shell.openExternal(
                'https://en.wikipedia.org/wiki/Human_User_Interface_Protocol'
              )
            }
          >
            mackie control protocol
          </InlineStatus>{' '}
          consoles.
        </li>
        <li>
          <b>flying faders</b>, DAW controllers, that good shit
        </li>
        <li>
          echo / delay can be set to a proportion of current tempo, for on beat echoes
        </li>
        <li>lotsa fixes. big ups too all yall using this!</li>
      </ChangeList>
      <Status
        styles={{ size: (s) => s * 1.05 }}
        link
        onClick={() =>
          electron.shell.openExternal(
            'https://github.com/satchelspencer/repsyps/releases'
          )
        }
      >
        show full history
      </Status>
    </ChangeWrapper>
  )
}

export default memo(ChangeLog)
