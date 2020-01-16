import React, { useEffect, useRef, useState, useMemo } from 'react'
import ReactDOM from 'react-dom'
import ctyled, { active, inline } from 'ctyled'
import { ipcRenderer } from 'electron'
import _ from 'lodash'
import pathUtils from 'path'
import { StoreContext } from 'redux-react-hook'

import store from './redux/store'

const Wrapper = ctyled.div.styles({
  bg: true,
  color: c => c.absLum(0.9).contrast(0.1),
  align: 'center',
  justify: 'center',
}).extendSheet`
  position:absolute;
  width:100%;
  height:100%;
  top:0;
  left:0;
`

function App() {
  return <Wrapper>threlve</Wrapper>
}

ReactDOM.render(
  <StoreContext.Provider value={store}>
    <App />
  </StoreContext.Provider>,
  document.getElementById('app')
)
