#include "impdet.h"

static unsigned int IMPDET_WINSIZE = 512;
static unsigned int IMPDET_AVGLEN = 80;
static int IMPDET_CUTOFF = 3000;

std::vector<int> impulseDetect(float* source, int sourceLen){
  Dsp::Filter* filter = new Dsp::FilterDesign<Dsp::RBJ::Design::HighPass, 1>();
  Dsp::Params params;
  params[0] = SAMPLE_RATE;
  params[1] = IMPDET_CUTOFF; // cutoff frequency
  params[2] = 1.25; // Q
  filter->setParams(params);

  std::vector<int> beats;  //output
  unsigned int winCount = (sourceLen / IMPDET_WINSIZE) - 1;
  std::list<float> lastMeans = { 1. };

  float* winBuffer = new float[IMPDET_WINSIZE];

  float sampleValue;
  unsigned int startSample;
  unsigned int winSampleIndex;
  float energyAvg;
  float energyVar;
  float energy;
  bool inBeat;

  for(unsigned int winIndex=0;winIndex<winCount;winIndex++){
    startSample = winIndex * IMPDET_WINSIZE;
    energy = 0;

    /* copy into buffer for filtering */
    for(winSampleIndex=0;winSampleIndex<IMPDET_WINSIZE;winSampleIndex++)
      winBuffer[winSampleIndex] = source[startSample + winSampleIndex];
    
    filter->process(IMPDET_WINSIZE, &winBuffer);

    for(winSampleIndex=0;winSampleIndex<IMPDET_WINSIZE;winSampleIndex++){
      sampleValue = winBuffer[winSampleIndex];
      energy += sampleValue*sampleValue;
    }
    energy /= IMPDET_WINSIZE; 
      
    energyAvg = 0;
    for(float v : lastMeans) energyAvg += v;
    energyAvg /= lastMeans.size();

    energyVar = 0;
    for(float v : lastMeans) energyVar += std::pow(v-energyAvg,2);
    energyVar /= lastMeans.size();

    lastMeans.push_front(energy);
    if(lastMeans.size() > IMPDET_AVGLEN) lastMeans.pop_back();

    if((energy/energyAvg) > ((-0.002*energyVar) + 1.7)){
      if(!inBeat){ //trigger on rising edge past threshold
        inBeat = true;
        beats.push_back(winIndex * IMPDET_WINSIZE);
      }
    }else if(inBeat) inBeat = false;
  }

  delete [] winBuffer;
  delete filter;
  
  return beats;
}