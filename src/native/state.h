#include <napi.h>
#include "portaudio.h"
#include <complex.h>
#include <liquid.h>
#include <unordered_map> 
#include <vector>
#include <iostream>
#include <list>
#include <rubberband/RubberBandStretcher.h>
#include <DspFilters/Dsp.h>
#include <samplerate.h>

#include "constants.h"
#include "stretcher.h"
#include "ringbuffer.h"

#ifndef STATE_HEADER_H
#define STATE_HEADER_H

typedef struct{
  float volume;
  double time;
  bool playing;
  int period;
  float maxLevel;
} playback;

typedef struct{
  float volume;
  int offset;
  bool destroy;
} mixTrackSourceConfig;

typedef struct{
  std::unordered_map<std::string, mixTrackSourceConfig*> sourceTracksParams;
  std::vector<int> chunks;
  float alpha;
  float volume;
  bool playing;
  bool loop;
  bool muted;
  float filter;
  float delay;
  float delayGain;
  bool aperiodic;
  bool preservePitch;
  bool nextAtChunk;
  int chunkIndex;
  bool unpause;
  bool preview;
} mixTrackPlayback;

typedef struct{
  mixTrackPlayback* playback;
  mixTrackPlayback* nextPlayback;
  bool hasNext;
  double sample;
  double lastCommit;
  double phase;
  int overlapIndex;
  bool hasFilter;
  bool removed;
  bool safe;
  ringbuffer *delayBuffer;
  PVStretcher* pvstretcher;
  REStretcher* restretcher;
  ringbuffer *inputBuffer;
  float** stretchInput;
  float** stretchOutput;
  firfilt_rrrf filter;
} mixTrack;

typedef struct{
  std::vector<float*> channels;
  int length;
  uint8_t ** data;
  bool removed;
  bool safe;
} source;

typedef struct{
  std::vector<float*>  channels;
  int size;
  int used;
  int* bounds;
  int boundsCount;
} recordChunk;

typedef struct{
  bool started;
  bool fromSource;
  std::string fromSourceId;
  unsigned int fromSourceOffset;
  std::vector<recordChunk*> chunks;
  unsigned int chunkIndex;
  int length;
} recording;

typedef struct{
  ringbuffer *buffer;
  ringbuffer *previewBuffer;
  bool previewing;
  float* window;
  unsigned int windowSize;
  playback *playback;
  std::unordered_map<std::string, mixTrack*> mixTracks;
  std::unordered_map<std::string, source*> sources;
  recording* recording;
} streamState;

#endif