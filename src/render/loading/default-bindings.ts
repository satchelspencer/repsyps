import { Versioned } from './apply-migration'
import * as Types from 'render/util/types'

const defaultBindingsFile: Versioned<Types.BindingsFile> = {
  state: {
    bindings: {},
    globalControls: {},
  },
  version: '0.0.0',
}

export default defaultBindingsFile
