/*
 *  DSP.js - a comprehensive digital signal processing  library for javascript
 *
 *  Created by Corban Brook <corbanbrook@gmail.com> on 2010-01-01.
 *  Copyright 2010 Corban Brook. All rights reserved.
 *
 */

////////////////////////////////////////////////////////////////////////////////
//                                  CONSTANTS                                 //
////////////////////////////////////////////////////////////////////////////////

/**
 * DSP is an object which contains general purpose utility functions and constants
 */
var DSP = {
  // Channels
  LEFT: 0,
  RIGHT: 1,
  MIX: 2,

  // Waveforms
  SINE: 1,
  TRIANGLE: 2,
  SAW: 3,
  SQUARE: 4,

  // Filters
  LOWPASS: 0,
  HIGHPASS: 1,
  BANDPASS: 2,
  NOTCH: 3,

  // Window functions
  BARTLETT: 1,
  BARTLETTHANN: 2,
  BLACKMAN: 3,
  COSINE: 4,
  GAUSS: 5,
  HAMMING: 6,
  HANN: 7,
  LANCZOS: 8,
  RECTANGULAR: 9,
  TRIANGULAR: 10,

  // Loop modes
  OFF: 0,
  FW: 1,
  BW: 2,
  FWBW: 3,

  // Math
  TWO_PI: 2 * Math.PI,
}

////////////////////////////////////////////////////////////////////////////////
//                            DSP UTILITY FUNCTIONS                           //
////////////////////////////////////////////////////////////////////////////////

/**
 * Inverts the phase of a signal
 *
 * @param {Array} buffer A sample buffer
 *
 * @returns The inverted sample buffer
 */
DSP.invert = function(buffer) {
  for (var i = 0, len = buffer.length; i < len; i++) {
    buffer[i] *= -1
  }

  return buffer
}

/**
 * Converts split-stereo (dual mono) sample buffers into a stereo interleaved sample buffer
 *
 * @param {Array} left  A sample buffer
 * @param {Array} right A sample buffer
 *
 * @returns The stereo interleaved buffer
 */
DSP.interleave = function(left, right) {
  if (left.length !== right.length) {
    throw 'Can not interleave. Channel lengths differ.'
  }

  var stereoInterleaved = new Float64Array(left.length * 2)

  for (var i = 0, len = left.length; i < len; i++) {
    stereoInterleaved[2 * i] = left[i]
    stereoInterleaved[2 * i + 1] = right[i]
  }

  return stereoInterleaved
}

/**
 * Converts a stereo-interleaved sample buffer into split-stereo (dual mono) sample buffers
 *
 * @param {Array} buffer A stereo-interleaved sample buffer
 *
 * @returns an Array containing left and right channels
 */
DSP.deinterleave = (function() {
  var left,
    right,
    mix,
    deinterleaveChannel = []

  deinterleaveChannel[DSP.MIX] = function(buffer) {
    for (var i = 0, len = buffer.length / 2; i < len; i++) {
      mix[i] = (buffer[2 * i] + buffer[2 * i + 1]) / 2
    }
    return mix
  }

  deinterleaveChannel[DSP.LEFT] = function(buffer) {
    for (var i = 0, len = buffer.length / 2; i < len; i++) {
      left[i] = buffer[2 * i]
    }
    return left
  }

  deinterleaveChannel[DSP.RIGHT] = function(buffer) {
    for (var i = 0, len = buffer.length / 2; i < len; i++) {
      right[i] = buffer[2 * i + 1]
    }
    return right
  }

  return function(channel, buffer) {
    left = left || new Float64Array(buffer.length / 2)
    right = right || new Float64Array(buffer.length / 2)
    mix = mix || new Float64Array(buffer.length / 2)

    if (buffer.length / 2 !== left.length) {
      left = new Float64Array(buffer.length / 2)
      right = new Float64Array(buffer.length / 2)
      mix = new Float64Array(buffer.length / 2)
    }

    return deinterleaveChannel[channel](buffer)
  }
})()

/**
 * Separates a channel from a stereo-interleaved sample buffer
 *
 * @param {Array}  buffer A stereo-interleaved sample buffer
 * @param {Number} channel A channel constant (LEFT, RIGHT, MIX)
 *
 * @returns an Array containing a signal mono sample buffer
 */
DSP.getChannel = DSP.deinterleave

/**
 * Helper method (for Reverb) to mix two (interleaved) samplebuffers. It's possible
 * to negate the second buffer while mixing and to perform a volume correction
 * on the final signal.
 *
 * @param {Array} sampleBuffer1 Array containing Float values or a Float64Array
 * @param {Array} sampleBuffer2 Array containing Float values or a Float64Array
 * @param {Boolean} negate When true inverts/flips the audio signal
 * @param {Number} volumeCorrection When you add multiple sample buffers, use this to tame your signal ;)
 *
 * @returns A new Float64Array interleaved buffer.
 */
DSP.mixSampleBuffers = function(sampleBuffer1, sampleBuffer2, negate, volumeCorrection) {
  var outputSamples = new Float64Array(sampleBuffer1)

  for (var i = 0; i < sampleBuffer1.length; i++) {
    outputSamples[i] += (negate ? -sampleBuffer2[i] : sampleBuffer2[i]) / volumeCorrection
  }

  return outputSamples
}

// Biquad filter types
DSP.LPF = 0 // H(s) = 1 / (s^2 + s/Q + 1)
DSP.HPF = 1 // H(s) = s^2 / (s^2 + s/Q + 1)
DSP.BPF_CONSTANT_SKIRT = 2 // H(s) = s / (s^2 + s/Q + 1)  (constant skirt gain, peak gain = Q)
DSP.BPF_CONSTANT_PEAK = 3 // H(s) = (s/Q) / (s^2 + s/Q + 1)      (constant 0 dB peak gain)
DSP.NOTCH = 4 // H(s) = (s^2 + 1) / (s^2 + s/Q + 1)
DSP.APF = 5 // H(s) = (s^2 - s/Q + 1) / (s^2 + s/Q + 1)
DSP.PEAKING_EQ = 6 // H(s) = (s^2 + s*(A/Q) + 1) / (s^2 + s/(A*Q) + 1)
DSP.LOW_SHELF = 7 // H(s) = A * (s^2 + (sqrt(A)/Q)*s + A)/(A*s^2 + (sqrt(A)/Q)*s + 1)
DSP.HIGH_SHELF = 8 // H(s) = A * (A*s^2 + (sqrt(A)/Q)*s + 1)/(s^2 + (sqrt(A)/Q)*s + A)

// Biquad filter parameter types
DSP.Q = 1
DSP.BW = 2 // SHARED with BACKWARDS LOOP MODE
DSP.S = 3

// Find RMS of signal
DSP.RMS = function(buffer) {
  var total = 0

  for (var i = 0, n = buffer.length; i < n; i++) {
    total += buffer[i] * buffer[i]
  }

  return Math.sqrt(total / n)
}

// Find Peak of signal
DSP.Peak = function(buffer) {
  var peak = 0

  for (var i = 0, n = buffer.length; i < n; i++) {
    peak = Math.abs(buffer[i]) > peak ? Math.abs(buffer[i]) : peak
  }

  return peak
}

// Fourier Transform Module used by DFT, FFT, RFFT
function FourierTransform(bufferSize, sampleRate) {
  this.bufferSize = bufferSize
  this.sampleRate = sampleRate
  this.bandwidth = ((2 / bufferSize) * sampleRate) / 2

  this.spectrum = new Float64Array(bufferSize / 2)
  this.real = new Float64Array(bufferSize)
  this.imag = new Float64Array(bufferSize)

  this.peakBand = 0
  this.peak = 0

  /**
   * Calculates the *middle* frequency of an FFT band.
   *
   * @param {Number} index The index of the FFT band.
   *
   * @returns The middle frequency in Hz.
   */
  this.getBandFrequency = function(index) {
    return this.bandwidth * index + this.bandwidth / 2
  }

  this.calculateSpectrum = function() {
    var spectrum = this.spectrum,
      real = this.real,
      imag = this.imag,
      bSi = 2 / this.bufferSize,
      sqrt = Math.sqrt,
      rval,
      ival,
      mag

    for (var i = 0, N = bufferSize / 2; i < N; i++) {
      rval = real[i]
      ival = imag[i]
      mag = bSi * sqrt(rval * rval + ival * ival)

      if (mag > this.peak) {
        this.peakBand = i
        this.peak = mag
      }

      spectrum[i] = mag
    }
  }
}

/**
 * DFT is a class for calculating the Discrete Fourier Transform of a signal.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
function DFT(bufferSize, sampleRate) {
  FourierTransform.call(this, bufferSize, sampleRate)

  var N = (bufferSize / 2) * bufferSize
  var TWO_PI = 2 * Math.PI

  this.sinTable = new Float64Array(N)
  this.cosTable = new Float64Array(N)

  for (var i = 0; i < N; i++) {
    this.sinTable[i] = Math.sin((i * TWO_PI) / bufferSize)
    this.cosTable[i] = Math.cos((i * TWO_PI) / bufferSize)
  }
}

/**
 * Performs a forward transform on the sample buffer.
 * Converts a time domain signal to frequency domain spectra.
 *
 * @param {Array} buffer The sample buffer
 *
 * @returns The frequency spectrum array
 */
DFT.prototype.forward = function(buffer) {
  var real = this.real,
    imag = this.imag,
    rval,
    ival

  for (var k = 0; k < this.bufferSize / 2; k++) {
    rval = 0.0
    ival = 0.0

    for (var n = 0; n < buffer.length; n++) {
      rval += this.cosTable[k * n] * buffer[n]
      ival += this.sinTable[k * n] * buffer[n]
    }

    real[k] = rval
    imag[k] = ival
  }

  return this.calculateSpectrum()
}

/**
 * FFT is a class for calculating the Discrete Fourier Transform of a signal
 * with the Fast Fourier Transform algorithm.
 *
 * @param {Number} bufferSize The size of the sample buffer to be computed. Must be power of 2
 * @param {Number} sampleRate The sampleRate of the buffer (eg. 44100)
 *
 * @constructor
 */
export function FFT(bufferSize, sampleRate) {
  FourierTransform.call(this, bufferSize, sampleRate)

  this.reverseTable = new Uint32Array(bufferSize)

  var limit = 1
  var bit = bufferSize >> 1

  var i

  while (limit < bufferSize) {
    for (i = 0; i < limit; i++) {
      this.reverseTable[i + limit] = this.reverseTable[i] + bit
    }

    limit = limit << 1
    bit = bit >> 1
  }

  this.sinTable = new Float64Array(bufferSize)
  this.cosTable = new Float64Array(bufferSize)

  for (i = 0; i < bufferSize; i++) {
    this.sinTable[i] = Math.sin(-Math.PI / i)
    this.cosTable[i] = Math.cos(-Math.PI / i)
  }
}

/**
 * Performs a forward transform on the sample buffer.
 * Converts a time domain signal to frequency domain spectra.
 *
 * @param {Array} buffer The sample buffer. Buffer Length must be power of 2
 *
 * @returns The frequency spectrum array
 */
FFT.prototype.forward = function(buffer) {
  // Locally scope variables for speed up
  var bufferSize = this.bufferSize,
    cosTable = this.cosTable,
    sinTable = this.sinTable,
    reverseTable = this.reverseTable,
    real = this.real,
    imag = this.imag,
    spectrum = this.spectrum

  var k = Math.floor(Math.log(bufferSize) / Math.LN2)

  if (Math.pow(2, k) !== bufferSize) {
    throw 'Invalid buffer size, must be a power of 2.'
  }
  if (bufferSize !== buffer.length) {
    throw 'Supplied buffer is not the same size as defined FFT. FFT Size: ' +
      bufferSize +
      ' Buffer Size: ' +
      buffer.length
  }

  var halfSize = 1,
    phaseShiftStepReal,
    phaseShiftStepImag,
    currentPhaseShiftReal,
    currentPhaseShiftImag,
    off,
    tr,
    ti,
    tmpReal,
    i

  for (i = 0; i < bufferSize; i++) {
    real[i] = buffer[reverseTable[i]]
    imag[i] = 0
  }

  while (halfSize < bufferSize) {
    //phaseShiftStepReal = Math.cos(-Math.PI/halfSize);
    //phaseShiftStepImag = Math.sin(-Math.PI/halfSize);
    phaseShiftStepReal = cosTable[halfSize]
    phaseShiftStepImag = sinTable[halfSize]

    currentPhaseShiftReal = 1
    currentPhaseShiftImag = 0

    for (var fftStep = 0; fftStep < halfSize; fftStep++) {
      i = fftStep

      while (i < bufferSize) {
        off = i + halfSize
        tr = currentPhaseShiftReal * real[off] - currentPhaseShiftImag * imag[off]
        ti = currentPhaseShiftReal * imag[off] + currentPhaseShiftImag * real[off]

        real[off] = real[i] - tr
        imag[off] = imag[i] - ti
        real[i] += tr
        imag[i] += ti

        i += halfSize << 1
      }

      tmpReal = currentPhaseShiftReal
      currentPhaseShiftReal =
        tmpReal * phaseShiftStepReal - currentPhaseShiftImag * phaseShiftStepImag
      currentPhaseShiftImag =
        tmpReal * phaseShiftStepImag + currentPhaseShiftImag * phaseShiftStepReal
    }

    halfSize = halfSize << 1
  }

  return this.calculateSpectrum()
}

FFT.prototype.inverse = function(real, imag, buffer) {
  // Locally scope variables for speed up
  var bufferSize = this.bufferSize,
    cosTable = this.cosTable,
    sinTable = this.sinTable,
    reverseTable = this.reverseTable,
    spectrum = this.spectrum

  real = real || this.real
  imag = imag || this.imag

  var halfSize = 1,
    phaseShiftStepReal,
    phaseShiftStepImag,
    currentPhaseShiftReal,
    currentPhaseShiftImag,
    off,
    tr,
    ti,
    tmpReal,
    i

  for (i = 0; i < bufferSize; i++) {
    imag[i] *= -1
  }

  var revReal = new Float64Array(bufferSize)
  var revImag = new Float64Array(bufferSize)

  for (i = 0; i < real.length; i++) {
    revReal[i] = real[reverseTable[i]]
    revImag[i] = imag[reverseTable[i]]
  }

  real = revReal
  imag = revImag

  while (halfSize < bufferSize) {
    phaseShiftStepReal = cosTable[halfSize]
    phaseShiftStepImag = sinTable[halfSize]
    currentPhaseShiftReal = 1
    currentPhaseShiftImag = 0

    for (var fftStep = 0; fftStep < halfSize; fftStep++) {
      i = fftStep

      while (i < bufferSize) {
        off = i + halfSize
        tr = currentPhaseShiftReal * real[off] - currentPhaseShiftImag * imag[off]
        ti = currentPhaseShiftReal * imag[off] + currentPhaseShiftImag * real[off]

        real[off] = real[i] - tr
        imag[off] = imag[i] - ti
        real[i] += tr
        imag[i] += ti

        i += halfSize << 1
      }

      tmpReal = currentPhaseShiftReal
      currentPhaseShiftReal =
        tmpReal * phaseShiftStepReal - currentPhaseShiftImag * phaseShiftStepImag
      currentPhaseShiftImag =
        tmpReal * phaseShiftStepImag + currentPhaseShiftImag * phaseShiftStepReal
    }

    halfSize = halfSize << 1
  }

  // var buffer = new Float64Array(bufferSize); // this should be reused instead
  for (i = 0; i < bufferSize; i++) {
    buffer[i] = real[i] / bufferSize
  }

  return buffer
}
