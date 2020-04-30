#include <napi.h>
#include "portaudio.h"
#include <complex.h>
#include <liquid.h>
#include <unordered_map> 
#include <vector>
#include <iostream>
#include <list>

#ifndef STATE_HEADER_H
#define STATE_HEADER_H

static bool REPSYS_LOG = false;
static int CHANNEL_COUNT = 2;
static int OVERLAP_COUNT = 2;
static int WINDOW_STEP = 256;
static int WINDOW_SIZE =  OVERLAP_COUNT * WINDOW_STEP;
#define PV_WINDOW_SIZE 1024
static int PV_MAX_FREQ = (PV_WINDOW_SIZE / 2) - 1;
static int PV_RATE = 44100;
static float PV_ABSTOL = 1e-6;
static float PV_FREQ_STEP = PV_RATE / (float)(PV_WINDOW_SIZE);

typedef struct{
  float volume;
  double time;
  bool playing;
  int period;
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
  bool aperiodic;
  bool preservePitch;
  bool nextAtChunk;
  int chunkIndex;
  bool unpause;
} mixTrackPlayback;

typedef struct{
  std::vector<float*>  channels;
  int size;
  int head;
  int tail;
} ringbuffer;

typedef struct{
  float* lastPhaseTimeDelta;
  float* lastPFFT;
  float* currentPFFT;
  float* nextPFFT;
} pvState;

typedef struct{
  mixTrackPlayback* playback;
  mixTrackPlayback* nextPlayback;
  bool hasNext;
  double sample;
  double phase;
  int overlapIndex;
  bool hasFilter;
  bool removed;
  bool safe;
} mixTrack;

typedef struct{
  std::vector<float*>  channels;
  std::vector<pvState *> pvStates;
  std::vector<firfilt_rrrf> filters;
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
  float* window;
  float* pvWindow;
  float* fftWindow;
  double* omega;
  unsigned int windowSize;
  playback *playback;
  std::unordered_map<std::string, mixTrack*> mixTracks;
  std::unordered_map<std::string, source*> sources;
  recording* recording;
} streamState;

#endif