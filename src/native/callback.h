#include "portaudio.h"
#include <math.h>
#include <random>
extern "C"{
  #include <libavcodec/avcodec.h>
  #include <libavformat/avformat.h>
}
#include <complex.h>
#include <fftw3.h>

#include "state.h"

double getMixTrackPhase(
  playback* playback,
  mixTrackPlayback* mixTrackPlayback
);

void copyToOut(
  ringbuffer * buffer, 
  float * out, 
  unsigned int & outputFrameIndex,
  unsigned long framesPerBuffer 
);

void applyNextPlayback(mixTrack * mixTrack);

int paCallbackMethod(
  const void *inputBuffer, 
  void *outputBuffer,
  unsigned long framesPerBuffer,
  const PaStreamCallbackTimeInfo* timeInfo,
  PaStreamCallbackFlags statusFlags,
  void *userData
);

int paPreviewCallbackMethod(
  const void *inputBuffer, 
  void *outputBuffer,
  unsigned long framesPerBuffer,
  const PaStreamCallbackTimeInfo* timeInfo,
  PaStreamCallbackFlags statusFlags,
  void *userData
);