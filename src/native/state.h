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

#ifndef STATE_HEADER_H
#define STATE_HEADER_H

static bool REPSYS_LOG = false;
static int CHANNEL_COUNT = 2;
static int OVERLAP_COUNT = 2;
static int WINDOW_STEP = 256;
static int WINDOW_SIZE =  OVERLAP_COUNT * WINDOW_STEP;
#define PV_WINDOW_SIZE 2048
static int ANALYSIS_SIZE = PV_WINDOW_SIZE * 4;
static int PV_MAX_FREQ = (PV_WINDOW_SIZE / 2) - 1;
static int PV_RATE = 44100;
static float PV_ABSTOL = 1e-3;
static float PV_FREQ_STEP = PV_RATE / (float)(PV_WINDOW_SIZE);
static int DELAY_MAX_SIZE = PV_RATE * 10;


class Stretcher {
  public:
    virtual int getAvailable() = 0;
    virtual int getRequired() = 0;
    virtual int getTimeRatio() = 0;
    virtual void setTimeRatio(double ratio) = 0;
    virtual void setPitchRatio(double ratio) = 0;
    virtual void reset() = 0;
    virtual void process(float **input, int samples) = 0;
    virtual void retrieve(float **output, int samples) = 0;
};

class PVStretcher: public Stretcher{
  public: 
    PVStretcher(){
      stretcher = new RubberBand::RubberBandStretcher(
        PV_RATE,
        CHANNEL_COUNT,
        RubberBand::RubberBandStretcher::OptionProcessRealTime |
        RubberBand::RubberBandStretcher::OptionDetectorCompound ,
        1.0,
        1.0
      );
      stretcher->setTransientsOption(RubberBand::RubberBandStretcher::OptionTransientsCrisp);
      stretcher->setPhaseOption(RubberBand::RubberBandStretcher::OptionPhaseLaminar);
      stretcher->setDetectorOption(RubberBand::RubberBandStretcher::OptionDetectorCompound);
      stretcher->setFormantOption(RubberBand::RubberBandStretcher::OptionFormantPreserved);
    }
    int getAvailable(){
      return stretcher->available();
    }
    int getRequired(){
      return stretcher->getSamplesRequired();
    }
    int getTimeRatio(){
      return stretcher->getTimeRatio();
    }
    void setTimeRatio(double ratio){
      stretcher->setTimeRatio(ratio);
    }
    void setPitchRatio(double ratio){
      stretcher->setPitchScale(ratio);
    }
    void reset(){
      stretcher->reset();
    }
    void process(float **input, int samples){
      stretcher->process(input, samples, false);
    }
    void retrieve(float **output, int samples){
      stretcher->retrieve(output, samples);
    }
  private:
    RubberBand::RubberBandStretcher *stretcher;
};

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
  double lastCommit;
  double phase;
  int overlapIndex;
  bool hasFilter;
  bool removed;
  bool safe;
  ringbuffer *delayBuffer;
  PVStretcher* pvstretcher;
  ringbuffer *inputBuffer;
  float** stretchInput;
  float** stretchOutput;
  firfilt_rrrf filter;
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
  ringbuffer *previewBuffer;
  bool previewing;
  float* window;
  float* pvWindow;
  double* omega;
  unsigned int windowSize;
  playback *playback;
  std::unordered_map<std::string, mixTrack*> mixTracks;
  std::unordered_map<std::string, source*> sources;
  recording* recording;
} streamState;

#endif