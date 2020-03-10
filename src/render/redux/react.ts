import {
  useSelector as useReduxSelector,
  useStore as useReduxStore,
  TypedUseSelectorHook,
} from 'react-redux'
import { Store } from 'redux'

import * as Types from 'render/util/types'

export { useDispatch } from 'react-redux'

export const useSelector: TypedUseSelectorHook<Types.State> = useReduxSelector

export const useStore: () => Store<Types.State, any> = useReduxStore
