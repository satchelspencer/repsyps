import React, { memo, useMemo } from 'react'
import _ from 'lodash'

export default function extend<P extends {}, ET extends {}>(
  Component: React.ComponentType<P>,
  getExtend: (eprops: ET) => Partial<P>,
  defaultProps?: Partial<ET>
) {
  defaultProps = defaultProps || {}
  const eProps = _.keys(defaultProps)
  return memo((props: P & ET) => {
    const extend = useMemo(
      () => {
        const ep = {
          ...defaultProps,
          ...(_.pick(props, eProps) as ET),
        }
        return getExtend(ep)
      },
      eProps.map(prop => props[prop])
    )

    return <Component {...(_.omit(props, eProps) as P)} {...extend} />
  })
}
