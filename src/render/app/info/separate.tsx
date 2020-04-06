import React, { memo, useCallback } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import separate from 'render/util/separate'

import Icon from 'render/components/icon'
import { HeaderContent, FillButton } from 'render/components/misc'

import SidebarItem from 'render/components/item'

export interface SeparateProps {
  trackId: string
}

const Separate = memo((props: SeparateProps) => {
  const name = useSelector(state => state.sources[props.trackId].name),
    dispatch = useDispatch(),
    handleSeparate = useCallback(() => separate(name, props.trackId, dispatch), [
      props.trackId,
      name,
    ])

  return (
    <SidebarItem
      title={
        <>
          <HeaderContent>
            <Icon name="cut" scale={1.1} />
            <span>&nbsp;Track Separation</span>
          </HeaderContent>
          <FillButton onClick={handleSeparate}>Separate</FillButton>
        </>
      }
    />
  )
})

export default Separate
