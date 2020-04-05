import React, { memo } from 'react'

export default function extend<P extends {}>(Component: React.ComponentType<P>, extend: Partial<P>) {
  return memo((props: P) => <Component {...props} {...extend} />)
}
