import React, { useCallback } from 'react'
import { useMappedState, useDispatch } from 'redux-react-hook'
import * as _ from 'lodash'

import * as Types from 'lib/types'
import * as Actions from 'render/redux/actions'

import ControlAdder from 'render/components/control-adder'
import Volume from 'render/components/volume'
import SidebarItem from './item'

export interface SourceVolumeProps {
  sourceId: string
}

const SourceVolume = (props: SourceVolumeProps) => {
  const getMappedState = useCallback(
      (state: Types.State) => {
        const source = state.sources[props.sourceId]
        return {
          sources: source && source.trackSources,
          name: source.name,
        }
      },
      [props.sourceId]
    ),
    { sources, name } = useMappedState(getMappedState),
    dispatch = useDispatch()

  return (
    <>
      {!!sources &&
        _.keys(sources).map(trackSourceId => {
          const trackSource = sources[trackSourceId]
          return (
            <SidebarItem
              key={trackSourceId}
              title={
                <>
                  <span>{trackSource.name}</span>
                  <Volume
                    volume={trackSource.volume}
                    onChange={v =>
                      dispatch(
                        Actions.setSourceTrack({
                          sourceId: props.sourceId,
                          trackSourceId,
                          trackSource: { volume: v },
                        })
                      )
                    }
                  />
                  <ControlAdder
                    name={trackSource.name + ' - ' + name}
                    params={{
                      sourceId: props.sourceId,
                      trackSourceId,
                      prop: 'volume',
                    }}
                    type="value"
                  />
                </>
              }
            />
          )
        })}
    </>
  )
}

export default SourceVolume
