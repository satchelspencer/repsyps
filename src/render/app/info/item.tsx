import React from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import Icon from 'render/components/icon'

const TrackItem = ctyled.div.styles({
  gutter: 1,
  column: true,
})

const Horizontal = ctyled.div.styles({
  align: 'center',
  gutter: 1,
})

const SubItem = ctyled.div.styles({
  padd: 1,
  column: true,
  gutter: 1,
}).extend`
  margin-top:0px !important;
  margin-left:${({ size }) => size * 0.7}px;
  padding-left:${({ size }) => size/2}px;
  border-left:1px solid ${({ color }) => color.bq};
`

interface SidebarItemProps {
  title: any
  children?: any
  caret?: boolean
  open?: boolean
  onSetOpen?: (open: boolean) => any
}

export default function SidebarItem(props: SidebarItemProps) {
  return (
    <TrackItem style={{ cursor: 'pointer' }}>
      <Horizontal onClick={() => props.onSetOpen && props.onSetOpen(!props.open)}>
        {props.title}
        {props.children && props.caret &&  (
          <Icon
            name={props.open ? 'caret-down' : 'caret-right'}
            styles={{ size: s => s * 1.8 }}
          />
        )}
      </Horizontal>
      {props.open && props.children && <SubItem>{props.children}</SubItem>}
    </TrackItem>
  )
}
