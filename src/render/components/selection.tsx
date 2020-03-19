import React, { useContext, createContext, useState, useMemo } from 'react'
import _ from 'lodash'

export interface SelectionContextState {
  callbacks: {
    [key: string]: (selected: any) => any
  }
}

const defaultState = { callbacks: {} }

export interface SelectionContext {
  state: SelectionContextState
  setState: (state: Partial<SelectionContextState>) => void
}

const selectionContext = createContext<SelectionContext>({
  state: defaultState,
  setState: null,
})

const { Provider } = selectionContext

export function SelectionContextProvider(props: any) {
  const [selState, setSelState] = useState<SelectionContextState>(defaultState),
    context = useMemo<SelectionContext>(
      () => ({
        state: selState,
        setState: state => {
          setSelState({ ...selState, ...state })
        },
      }),
      [selState]
    )
  return <Provider value={context}>{props.children}</Provider>
}

export function useSelection<T>(key: string) {
  const ctx = useContext(selectionContext)
  return {
    isSelecting: !!ctx.state.callbacks[key],
    getSelection: async () => {
      return new Promise<T>(res => {
        ctx.setState({
          callbacks: {
            ...ctx.state.callbacks,
            [key]: res,
          },
        })
      })
    },
  }
}

export function useSelectable<T>(key: string) {
  const ctx = useContext(selectionContext)
  return {
    isSelecting: !!ctx.state.callbacks[key],
    onSelect: (selected: T) => {
      if (ctx.state.callbacks[key]) {
        ctx.state.callbacks[key](selected)
        ctx.setState({ callbacks: _.omit(ctx.state.callbacks, key) })
      }
    },
  }
}
