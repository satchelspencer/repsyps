import { apply, Migration, Versioned } from './apply-migration'

interface First {
  a: number
}

interface Second {
  b: number
}

interface Third {
  c: number
}

interface Fourth {
  d: number
}

const c: Migration<Third, Fourth> = {
  fromVersion: 'b',
  toVersion: 'c',
  apply: old => ({ d: old.c }),
}

const b: Migration<Second, Third> = {
  fromVersion: 'a',
  toVersion: 'b',
  apply: old => ({ c: old.b }),
  next: c,
}

const a: Migration<First, Second> = {
  fromVersion: '0',
  toVersion: 'a',
  apply: old => ({ b: old.a }),
  next: b,
}

const start: Versioned<First> = {
  state: { a: 666 },
  version: '0',
}

console.log(apply(start, a))
