import React, { memo, useCallback } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import separate from 'render/util/separate'

import Icon from 'render/components/icon'
import { WideButton, HeaderContent } from 'render/components/misc'

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
            <Icon name="cut" styles={{ size: s => s * 1.1 }} />
            <span>&nbsp;Track Separation</span>
          </HeaderContent>
          <WideButton styles={{ flex: 1 }} onClick={handleSeparate}>
            Separate
          </WideButton>
        </>
      }
    />
  )
})

export default Separate
