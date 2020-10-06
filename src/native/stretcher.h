#include <iostream>
#include <rubberband/RubberBandStretcher.h>
#include <samplerate.h>

#include "constants.h"
#include "ringbuffer.h"

#ifndef STRETCHER_HEADER_H
#define STRETCHER_HEADER_H

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

class REStretcher: public Stretcher{
  public: 
    REStretcher();
    ~REStretcher();
    int getAvailable();
    int getRequired();
    int getTimeRatio();
    void setTimeRatio(double ratio);
    void setPitchRatio(double ratio);
    void reset();
    void process(float **input, int samples);
    void retrieve(float **output, int samples);
  private:
    SRC_STATE* resampler;
    SRC_DATA* data;
    float* inputBuffer;
    float* outputBuffer;
    ringbuffer *outputRing;
};

class PVStretcher: public Stretcher{
  public: 
    PVStretcher();
    ~PVStretcher();
    int getAvailable();
    int getRequired();
    int getTimeRatio();
    void setTimeRatio(double ratio);
    void setPitchRatio(double ratio);
    void reset();
    void process(float **input, int samples);
    void retrieve(float **output, int samples);
  private:
    RubberBand::RubberBandStretcher *stretcher;
};

#endif