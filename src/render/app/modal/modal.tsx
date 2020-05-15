import React, { memo, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'

import Relink from './relink'
import About from './about'

const ModalWrapper = ctyled.div.styles({
  align: 'center',
  justify: 'center',
}).extendSheet`
  position:absolute;
  top:0;
  left:0;
  bottom:0;
  right:0;
  background:${({ color }) => color.bg + 'aa'};
`

const ModalBody = ctyled.div.styles({})

function Modal() {
  const route = useSelector((state) => state.modalRoute),
    dispatch = useDispatch(),
    handleBodyClick = useCallback((e) => {
      e.stopPropagation()
    }, []),
    handleWrapperClick = useCallback(() => {
      dispatch(Actions.setModalRoute(null))
    }, [route])

  return (
    route !== null && (
      <ModalWrapper onClick={handleWrapperClick}>
        <ModalBody onClick={handleBodyClick}>
          {route === 'relink' && <Relink />}
          {route === 'about' && <About />}
        </ModalBody>
      </ModalWrapper>
    )
  )
}

export default memo(Modal)
