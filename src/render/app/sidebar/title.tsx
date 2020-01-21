import React from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import Icon from 'render/components/icon'

const SourceItem = ctyled.div.styles({
  gutter: 1,
  column: true,
})

const SourceTitle = ctyled.div.styles({
  flex: 1,
}).extend`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display:block;
  font-weight:bold;
`

const HeaderContent = ctyled.div.styles({
  size: s => s * 1.1,
  align: 'center',
  //justify: 'space-between',
  gutter: 0.5,
})

export interface TrackTitleProps {
  name: string
  icon: string
}

export default function TrackTitle(props: TrackTitleProps) {
  return (
    <SourceItem>
      <HeaderContent>
        <Icon name={props.icon} styles={{ size: s => s * 1.5 }} />
        <SourceTitle styles={{ size: s => s * 1.1 }}>{props.name}</SourceTitle>
      </HeaderContent>
    </SourceItem>
  )
}