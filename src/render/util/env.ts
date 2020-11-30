export const isMac = process.platform === 'darwin'

export const isDev = process.env.NODE_ENV === 'development'

export const version = '0.0.4'

let ratio = 1
try {
  ratio = window.devicePixelRatio
} catch (e) {}

export const devRatio = ratio

export const canvasScale = ratio
