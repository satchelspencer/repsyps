import React, { memo, useState, useRef, useCallback } from 'react'
import * as _ from 'lodash'
import ctyled, { active, inline } from 'ctyled'

import * as Selectors from 'render/redux/selectors'
import * as Actions from 'render/redux/actions'
import * as Types from 'render/util/types'
import uid from 'render/util/uid'

import { useSelector, useDispatch } from 'render/redux/react'
import { useSelection } from 'render/components/selection'
import {
  WideButton,
  SelectableButton,
  HeaderContent,
  SidebarValue,
} from 'render/components/misc'
import Icon from 'render/components/icon'
import SidebarItem from 'render/components/item'

const PresetsWrapper = ctyled.div.styles({
  width: 12,
  column: true,
  bg: true,
  lined: true,
})

const PresetsHead = ctyled.div.styles({
  align: 'center',
  justify: 'space-between',
  padd: 0.5,
  size: s => s * 1.3,
  bg: true,
  color: c => c.nudge(0.1),
})

const PresetItem = ctyled.div
  .attrs({ selected: false })
  .class(inline)
  .class(active)
  .styles({
    hover: 0.1,
    padd: 1,
    gutter: 1,
    align: 'center',
    color: (c, { selected }) => c.contrast(-0.1).nudge(selected ? 0.05 : 0),
  })

const PresetInput = ctyled.input.class(inline).styles({
  border: 0,
  bg: true,
  height: 2,
  padd: 1,
}).extend`
  outline-color: #f59797;
  outline-width: 2px;
`

const PresetItemName = ctyled.div.styles({
  flex: 1,
  height: 1.2,
})

const PresetItemNameInner = ctyled.div.styles({}).extendSheet`
  position:absolute;
  top:0;
  left:0;
  width:100%;
  height:100%;
  overflow:hidden;
  display:block;
  white-space:nowrap;
  text-overflow:ellipsis;
`

const HeadGroup = ctyled.div.styles({ gutter: 1 })

const PresetsBody = ctyled.div.styles({
  flex: 1,
  column: true,
  lined: true,
  scroll: true,
  borderColor: c => c.contrast(-0.1),
  endLine: true,
})

const Dot = ctyled.div.attrs({ selected: false }).styles({
  width: 0.5,
  height: 0.5,
}).extend`
  border-radius:50%;
  background:${({ color }, { selected }) =>
    selected ? 'rgba(255,0,0,0.5)' : color.nudge(0.15).bg};
`

const DotWrapper = ctyled.div.styles({
  width: 1,
  height: 1,
  align: 'center',
  justify: 'center',
}).extendSheet`
  cursor:pointer;
  &:hover{
    opacity:0.5;
  }
`

function Presets() {
  const presets = useSelector(state => state.live.controlPresets),
    defaultId = useSelector(state => state.live.defaultPresetId),
    dispatch = useDispatch(),
    [adding, setAdding] = useState(false),
    [newName, setNewName] = useState(''),
    handleCreatePreset = useCallback((name: string) => {
      setAdding(false)
      if (!name) return
      const id = uid()
      dispatch(
        Actions.addControlPreset({
          presetId: id,
          name,
        })
      )
      setSelected(id)
    }, []),
    [selected, setSelected] = useState<string>(null)

  return (
    <PresetsWrapper>
      <PresetsHead>
        <Icon
          disabled={!selected}
          asButton
          name="cheveron-left"
          onClick={() => dispatch(Actions.applyControlPreset(selected))}
        />
        <HeadGroup>
          <Icon
            asButton
            name="add"
            onClick={() => {
              setAdding(true)
              setNewName('')
            }}
          />
          <Icon
            asButton
            name="remove"
            onClick={() => dispatch(Actions.deleteControlPreset(selected))}
          />
        </HeadGroup>
      </PresetsHead>
      <PresetsBody>
        {adding && (
          <PresetInput
            onBlur={() => {
              setAdding(false)
              handleCreatePreset(newName)
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === 'Tab') handleCreatePreset(newName)
              if (e.key === 'Escape') setAdding(false)
            }}
            inRef={r => r && r.focus()}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="enter preset name"
          />
        )}
        {_.keys(presets).map(presetId => {
          const preset = presets[presetId]
          return (
            <PresetItem key={presetId} selected={selected === presetId}>
              <PresetItemName onClick={() => setSelected(presetId)}>
                <PresetItemNameInner>{preset.name}</PresetItemNameInner>
              </PresetItemName>
              <DotWrapper
                onClick={() => dispatch(Actions.setDefaultControlPreset(presetId))}
              >
                <Dot selected={defaultId === presetId} />
              </DotWrapper>
            </PresetItem>
          )
        })}
      </PresetsBody>
    </PresetsWrapper>
  )
}

export default memo(Presets)
