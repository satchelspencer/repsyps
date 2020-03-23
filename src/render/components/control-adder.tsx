import React, { useMemo, useContext, useCallback } from 'react'
import ctyled, { CtyledContext } from 'ctyled'

import * as Types from 'render/util/types'
import { useSelectable } from 'render/components/selection'
import { CtyledComponent } from 'ctyled/dist/types'

export function adder<P>(Component: CtyledComponent<any, P>) {
  const Mod = Component.attrs({ selecting: false }).extendSheet`
    ${(_, { selecting }) =>
      selecting &&
      `
      & *{
        pointer-events:none;
      }
    `}
  `
  return (props: P & { params: Partial<Types.Control>; onClick?: any }) => {
    const { isSelecting, onSelect } = useSelectable<Partial<Types.Control>>('control'),
      ctyle = useContext(CtyledContext),
      childCtyle = useMemo(() => {
        return {
          ...ctyle,
          theme: {
            ...ctyle.theme,
            color: !isSelecting
              ? ctyle.theme.color
              : ctyle.theme.color.as(['black', 'rgba(255, 0, 0,0.5)', 'white']),
          },
        }
      }, [isSelecting, ctyle]),
      handleClick = useCallback(
        e => {
          if (isSelecting) onSelect(props.params)
          else props.onClick && props.onClick(e)
        },
        [props.params, isSelecting, props.onClick]
      )
    return (
      <CtyledContext.Provider value={childCtyle}>
        <Mod {...props} selecting={isSelecting} onClick={handleClick} />
      </CtyledContext.Provider>
    )
  }
}
