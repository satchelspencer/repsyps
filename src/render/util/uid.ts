import _ from 'lodash'
import pathUtils from 'path'

export default function uid(){
  return Math.floor(Math.random()*1e10).toString(16)
}

export function getId(path: string): string {
  return _.snakeCase(pathUtils.basename(path).substr(0, 15)) + new Date().getTime()
}