#include "portaudio.h"
#include <math.h>
#include <algorithm>
extern "C"{
  #include <libavcodec/avcodec.h>
  #include <libavformat/avformat.h>
}
#include <complex.h>
#include <liquid.h>
#undef  LIQUID_DEFINE_COMPLEX
#define LIQUID_DEFINE_COMPLEX(R,C) typedef std::complex<R> C

#include "state.h"
#include "filter.h"

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