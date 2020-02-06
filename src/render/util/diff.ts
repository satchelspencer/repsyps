/* fast shallow object diff */

export default function diff<T extends Object>(from: Partial<T>, to: Partial<T>) {
  const res: Partial<T> = {}
  for (let key in to) {
    if (from[key] !== to[key]) res[key] = to[key]
  }
  return res
}