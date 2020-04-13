export const isMac = process.platform === 'darwin'

export const isDev = process.env.NODE_ENV === 'development'

export const version = '0.0.0'

export const canvasScale = isMac ? 2 : 1
