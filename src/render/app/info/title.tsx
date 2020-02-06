import React from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import Icon from 'render/components/icon'

const TitleWrapper = ctyled.div.styles({
  gutter: 1,
  column: true,
  height: 1.3,
})

const HeaderContent = ctyled.div.styles({
  size: s => s * 1.1,
  align: 'center',
  gutter: 0.5,
})

const TrackNameWrapper = ctyled.div.styles({
  flex: 1,
  size: s => s * 1.1,
}).extend`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display:block;
  font-weight:bold;
`

export interface TrackTitleProps {
  name: string
  icon: string
}

export default function TrackTitle(props: TrackTitleProps) {
  return (
    <TitleWrapper>
      <HeaderContent>
        <Icon name={props.icon} styles={{ size: s => s * 1.5 }} />
        <TrackNameWrapper>{props.name}</TrackNameWrapper>
      </HeaderContent>
    </TitleWrapper>
  )
}
