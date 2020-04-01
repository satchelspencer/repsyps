/* very very fast is equal for json serializable objects */
var isArray = Array.isArray
var keyList = Object.keys
var hasProp = Object.prototype.hasOwnProperty

export default function isEqual(a, b) {
  if (a === b) return true

  if (a && b && typeof a === 'object' && typeof b === 'object') {
    var arrA = isArray(a),
      arrB = isArray(b),
      i,
      length,
      key

    if (arrA && arrB) {
      length = a.length
      if (length != b.length) return false
      for (i = length; i-- !== 0; ) if (!isEqual(a[i], b[i])) return false
      return true
    }

    if (arrA != arrB) return false

    var keys = keyList(a)
    length = keys.length

    if (length !== keyList(b).length) return false

    for (i = length; i-- !== 0; ) if (!hasProp.call(b, keys[i])) return false

    for (i = length; i-- !== 0; ) {
      key = keys[i]
      if (!isEqual(a[key], b[key])) return false
    }

    return true
  }
  return a !== a && b !== b
}

export function objShallowEqual(a, b) {
  if (a === b) return true
  else if(!a || !b) return false
  for (let key in a) {
    if (b[key] !== a[key]) {
      return false
    }
  }
  for (let key in b) {
    if (a[key] !== b[key]) {
      return false
    }
  }
  return true
}
