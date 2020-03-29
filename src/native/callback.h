#include "portaudio.h"
#include <math.h>

extern "C"{
  #include <libavcodec/avcodec.h>
  #include <libavformat/avformat.h>
}
#include <liquid.h>

#include "state.h"
#include "filter.h"

double getSamplePosition(
  std::vector<int> * chunks,
  int chunkIndex,
  double phase
);

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