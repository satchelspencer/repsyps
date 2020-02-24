import { useSelector as useReduxSelector, TypedUseSelectorHook } from 'react-redux'

import * as Types from 'render/util/types'

export { useDispatch } from 'react-redux'

export const useSelector: TypedUseSelectorHook<Types.State> = useReduxSelector
