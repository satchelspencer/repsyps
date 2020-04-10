import React from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import Icon from 'render/components/icon'
import { useSelector } from 'src/render/redux/react'

const TitleWrapper = ctyled.div.styles({
  gutter: 1,
  column: true,
  height: 1.3,
})

const HeaderContent = ctyled.div.styles({
  size: (s) => s * 1.1,
  align: 'center',
  gutter: 0.5,
})

const TrackNameWrapper = ctyled.div.styles({
  flex: 1,
  size: (s) => s * 1.1,
}).extend`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  display:block;
  font-weight:bold;
`

export interface TrackTitleProps {
  trackId: string
}

export default function TrackTitle(props: TrackTitleProps) {
  const name = useSelector((state) => state.sources[props.trackId].name)
  return (
    <TitleWrapper>
      <HeaderContent>
        <Icon name="wave" styles={{ size: (s) => s * 1.5 }} />
        <TrackNameWrapper>{name}</TrackNameWrapper>
      </HeaderContent>
    </TitleWrapper>
  )
}
