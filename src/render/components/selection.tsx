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
        function cancel(e: KeyboardEvent) {
          if (e.key === 'Escape') {
            ctx.setState({ callbacks: _.omit(ctx.state.callbacks, key) })
            window.removeEventListener('keydown', cancel)
            res(undefined)
          }
        }
        window.addEventListener('keydown', cancel)
        ctx.setState({
          callbacks: {
            ...ctx.state.callbacks,
            [key]: value => {
              window.removeEventListener('keydown', cancel)
              res(value)
            },
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
