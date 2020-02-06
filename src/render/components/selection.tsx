import React, { useContext, createContext, useState, useMemo } from 'react'

export interface SelectionContextState {
  callback: (selected: string) => any
}

const defaultState = { isSelecting: false, callback: null }

export interface SelectionContext {
  state: SelectionContextState
  setState: (state: Partial<SelectionContextState>) => any
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

export function useSelection() {
  const ctx = useContext(selectionContext)
  return {
    isSelecting: !!ctx.state.callback,
    getSelection: async () => {
      return new Promise<string>(res => {
        ctx.setState({
          callback: res,
        })
      })
    },
  }
}

export function useSelectable() {
  const ctx = useContext(selectionContext)
  return {
    isSelecting: !!ctx.state.callback,
    onSelect: (selected: string) => {
      if (ctx.state.callback) {
        ctx.state.callback(selected)
        ctx.setState({ callback: null })
      }
    },
  }
}
