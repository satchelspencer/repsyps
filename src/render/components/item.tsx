import React from 'react'
import * as _ from 'lodash'
import ctyled, { active } from 'ctyled'

import Icon from 'render/components/icon'

const TrackItem = ctyled.div.class(active).styles({
  gutter: 1,
  column: true,
  hover: 0,
})

const Horizontal = ctyled.div.styles({
  align: 'center',
  gutter: 1,
})

const SubItem = ctyled.div.styles({
  padd: 1,
  column: true,
  gutter: 1,
}).extendSheet`
  margin-top:0px !important;
  margin-left:${({ size }) => size * 0.7}px;
  padding-left:${({ size }) => size / 2}px;
  padding-right:0px !important;
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
    <TrackItem>
      <Horizontal onClick={() => props.onSetOpen && props.onSetOpen(!props.open)}>
        {props.title}
        {props.children && props.caret && (
          <Icon name={props.open ? 'caret-down' : 'caret-right'} scale={1.8} />
        )}
      </Horizontal>
      {props.open && props.children && <SubItem>{props.children}</SubItem>}
    </TrackItem>
  )
}
