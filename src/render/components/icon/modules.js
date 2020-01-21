import path from 'path'
import ctyled, { round } from 'ctyled'

const context = require.context('.', true, /\.svg$/)
const obj = {}
context.keys().forEach(function(key) {
  obj[path.basename(key).replace('.svg', '')] = ctyled(context(key).default).attrs({
    style: {},
  }).extend`
      display: inline-flex;
      fill: currentColor;
      width:${({ size }) => round(size)}px;
      height:${({ size }) => round(size)}px;

      & * {
        fill: currentColor;
      }
    `
})
export default obj
