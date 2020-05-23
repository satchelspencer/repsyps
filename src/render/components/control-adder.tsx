import React, { useMemo, useContext, useCallback } from 'react'
import { CtyledContext } from 'ctyled'

import * as Types from 'render/util/types'
import { useSelectable } from 'render/components/selection'
import { CtyledComponent } from 'ctyled/dist/types'

export interface AdderProps {
  params: Partial<Types.Control>
  onClick?: any
  noSelect?: boolean
}

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
  return (props: P & AdderProps) => {
    const { params, noSelect, ...childProps } = props,
      { isSelecting, onSelect } = useSelectable<Partial<Types.Control>>('control'),
      ctyle = useContext(CtyledContext),
      childCtyle = useMemo(() => {
        return {
          ...ctyle,
          theme: {
            ...ctyle.theme,
            color:
              !isSelecting || props.noSelect
                ? ctyle.theme.color
                : ctyle.theme.color.as(['black', 'rgba(255, 0, 0,0.5)', 'white']),
          },
        }
      }, [isSelecting, ctyle]),
      handleClick = useCallback(
        (e) => {
          e.preventDefault()
          const indexedParams =
            'trackIndex' in params && e.shiftKey
              ? { ...params, trackIndex: null }
              : params
          if (isSelecting && !props.noSelect) onSelect(indexedParams)
          else props.onClick && props.onClick(e)
        },
        [props.params, isSelecting, props.onClick]
      )
    return (
      <CtyledContext.Provider value={childCtyle}>
        <Mod {...(childProps as P)} selecting={isSelecting} onClick={handleClick} />
      </CtyledContext.Provider>
    )
  }
}
