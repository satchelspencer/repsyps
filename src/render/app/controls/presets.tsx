import React, { memo, useState, useRef, useCallback, useEffect } from 'react'
import * as _ from 'lodash'
import ctyled, { active, inline } from 'ctyled'

import * as Actions from 'render/redux/actions'
import * as Types from 'render/util/types'
import uid from 'render/util/uid'

import { useSelector, useDispatch } from 'render/redux/react'
import Icon from 'render/components/icon'
import Button from 'render/components/button'

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
  size: (s) => s * 1.3,
  bg: true,
  color: (c) => c.nudge(0.1),
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
    color: (c, { selected }) => c.contrast(-0.1).nudge(selected ? -0.05 : 0),
  })

const PresetInput = ctyled.input.class(inline).styles({
  border: 0,
  bg: true,
  height: 2,
  padd: 1,
}).extendSheet`
  outline-color: #f59797;
  outline-width: 2px;
  color:${({ color }) => color.fg} !important;
`

const PresetItemName = ctyled.div.styles({
  flex: 1,
  height: 1.2,
})

const PresetItemNameInner = ctyled.div.attrs({ selected: false }).styles({}).extendSheet`
  position:absolute;
  top:0;
  left:0;
  width:100%;
  height:100%;
  overflow:hidden;
  display:block;
  white-space:nowrap;
  text-overflow:ellipsis;
  text-decoration:${(_, { selected }) => (selected ? 'underline' : 'none')};
`

const HeadGroup = ctyled.div.styles({ gutter: 1 })

const PresetsBody = ctyled.div.styles({
  flex: 1,
  column: true,
  lined: true,
  scroll: true,
  borderColor: (c) => c.contrast(-0.1),
  endLine: true,
})

interface PresetProps {
  presetId: string
  preset: Types.ControlPreset
  onSelect: (presetId: string) => void
  selected: boolean
}

const Preset = memo((props: PresetProps) => {
  const dispatch = useDispatch(),
    handleClick = useCallback(() => props.onSelect(props.presetId), [props.presetId])
  return (
    <PresetItem onClick={handleClick} selected={props.selected}>
      <PresetItemName>
        <PresetItemNameInner selected={props.selected}>
          {props.preset.name}
        </PresetItemNameInner>
      </PresetItemName>
    </PresetItem>
  )
})

function Presets() {
  const presets = useSelector((state) => state.live.controlPresets),
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
    [selected, setSelected] = useState<string>(null),
    addPreset = useCallback(() => {
      setAdding(true)
      setNewName('')
    }, []),
    removePreset = useCallback(() => {
      dispatch(Actions.deleteControlPreset(selected))
      setSelected(null)
    }, [selected]),
    applyPreset = useCallback(() => dispatch(Actions.applyControlPreset(selected)), [
      selected,
    ]),
    handleBlur = useCallback(() => {
      setAdding(false)
      handleCreatePreset(newName)
    }, [newName]),
    handleKeyDown = useCallback(
      (e) => {
        e.stopPropagation()
        if (e.key === 'Enter' || e.key === 'Tab') handleCreatePreset(newName)
        if (e.key === 'Escape') setAdding(false)
      },
      [newName]
    ),
    inputRef = useCallback((r) => r && r.focus(), []),
    handleChange = useCallback((e) => setNewName(e.target.value), [])

  useEffect(() => {
    setSelected(_.keys(presets)[0])
  }, [])

  return (
    <PresetsWrapper>
      <PresetsHead>
        <Button
          styles={{ size: (s) => s * 0.8, padd: 0.3, color: (c) => c.contrast(0.1) }}
          disabled={!selected}
          onClick={applyPreset}
        >
          <Icon name="cheveron-left" />
          &nbsp;Apply&nbsp;
        </Button>
        <HeadGroup>
          <Icon asButton name="add" onClick={addPreset} />
          <Icon disabled={!selected} asButton name="remove" onClick={removePreset} />
        </HeadGroup>
      </PresetsHead>
      <PresetsBody>
        {adding && (
          <PresetInput
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            inRef={inputRef}
            value={newName}
            onChange={handleChange}
            placeholder="enter preset name"
          />
        )}
        {_.keys(presets).map((presetId) => {
          return (
            <Preset
              key={presetId}
              presetId={presetId}
              preset={presets[presetId]}
              selected={selected === presetId}
              onSelect={setSelected}
            />
          )
        })}
      </PresetsBody>
    </PresetsWrapper>
  )
}

export default memo(Presets)
