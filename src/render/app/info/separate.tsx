import React, { memo, useState, useCallback } from 'react'
import * as _ from 'lodash'

import { useDispatch, useSelector } from 'render/redux/react'
import separate from 'render/util/separate'

import Icon from 'render/components/icon'
import Spinner from 'render/components/spinner'
import { HeaderContent, FillButton } from 'render/components/misc'

import SidebarItem from 'render/components/item'

export interface SeparateProps {
  trackId: string
}

const Separate = memo((props: SeparateProps) => {
  const name = useSelector((state) => state.sources[props.trackId].name),
    dispatch = useDispatch(),
    [loading, setLoading] = useState(false),
    handleSeparate = useCallback(async () => {
      setLoading(true)
      await separate(name, props.trackId, dispatch)
      setLoading(false)
    }, [props.trackId, name])

  return (
    <SidebarItem
      title={
        <>
          <HeaderContent>
            <Icon name="cut" scale={1.1} />
            <span>&nbsp;Track Separation</span>
          </HeaderContent>
          <FillButton disabled={loading} onClick={handleSeparate}>
            {!loading ? (
              'Separate'
            ) : (
              <>
                <Spinner />
                &nbsp;Separating...
              </>
            )}
          </FillButton>
        </>
      }
    />
  )
})

export default Separate
