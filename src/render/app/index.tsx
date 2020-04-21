import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { palette } from 'render/components/theme'
import * as _ from 'lodash'
import ctyled from 'ctyled'

import { useSelector, useDispatch } from 'render/redux/react'
import * as Actions from 'render/redux/actions'
import useMeasure from 'render/components/measure'
import Menu from 'render/components/menu'

import Tracks from './tracks/tracks'
import Sidebar from './info/sidebar'
import Header from './header/header'
import Controls from './controls/controls'
import Modal from './modal/modal'

const Wrapper = ctyled.div.attrs({ invert: false }).styles({
  color: (c, { invert }) =>
    invert
      ? c.as(palette.gray).absLum(0.3).contrast(0.2).invert()
      : c.as(palette.gray).absLum(0.8).contrast(0.2),
  size: 11,
  bg: true,
  lined: true,
  align: 'stretch',
  column: true,
}).extendSheet`
    width:100%;
    height:100%;
    top:0;
    left:0;
    position:absolute;
    overflow:hidden;
    & * ::-webkit-scrollbar {     
      background-color: ${({ color }) => color.bg};
      width:${({ size }) => size}px;
      border-left:1px solid rgba(0,0,0,${({ color }) =>
        color.serial().inverted ? 0.35 : 0.1});
    }
    & ::-webkit-scrollbar-thumb {
      background: ${({ color }) => color.contrast(-0.2).nudge(0.1).bq};
    }
    & ::-webkit-scrollbar-thumb:hover {
      background: ${({ color }) => color.contrast(-0.2).nudge(0.2).bq};
    }
  `

const Body = ctyled.div.styles({
  flex: 1,
  lined: true,
}).extend`
  margin-top:1px;
`

const BodyInner = ctyled.div.styles({
  flex: 1,
  column: true,
  height: '100%',
})

function App() {
  const { darkMode, size } = useSelector((state) => state.settings),
    dispatch = useDispatch(),
    handleDragover = useCallback((e) => e.preventDefault(), []),
    handleDrop = useCallback((e) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0].path
      dispatch(Actions.addTrackAndSource(file))
    }, []),
    handleKeyDown = useCallback((e: React.KeyboardEvent) => {
      const controlOrCommand = e.metaKey || e.ctrlKey
      const isNativeRole =
        (e.key === 'q' && controlOrCommand) ||
        (e.key === 'h' && controlOrCommand) ||
        (e.key === 'c' && controlOrCommand) ||
        (e.key === 'v' && controlOrCommand) ||
        (e.key === 'i' && controlOrCommand && e.altKey) ||
        (e.key === 'f' && controlOrCommand && e.ctrlKey)
      
      if (!isNativeRole){
        e.preventDefault()
        //console.log('prevented')
      }
    }, [])

  useEffect(() => {
    window.addEventListener('dragover', handleDragover)
    window.addEventListener('drop', handleDrop)

    return () => {
      window.removeEventListener('dragover', handleDragover)
      window.removeEventListener('drop', handleDrop)
    }
  }, [])

  const wrapperStyles = useMemo(() => {
      return { size: (_) => size }
    }, [size]),
    bodyRef = useRef(null),
    { height } = useMeasure(bodyRef)
  return (
    <Wrapper
      invert={darkMode}
      styles={wrapperStyles}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <Menu />
      <Header />
      <Body inRef={bodyRef}>
        <Sidebar />
        <BodyInner>
          <Tracks />
          <Controls bodyHeight={height} />
        </BodyInner>
      </Body>
      <Modal />
    </Wrapper>
  )
}

export default memo(App)
