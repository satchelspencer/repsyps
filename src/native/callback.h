#include "portaudio.h"
#include <math.h>
#include "state.h"

double getSamplePosition(
  std::vector<int> * chunks,
  int chunkIndex,
  double phase
);

int paCallbackMethod(
  const void *inputBuffer, 
  void *outputBuffer,
  unsigned long framesPerBuffer,
  const PaStreamCallbackTimeInfo* timeInfo,
  PaStreamCallbackFlags statusFlags,
  void *userData
);