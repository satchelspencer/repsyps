#include "impdet.h"

static unsigned int IMPDET_WINSIZE = 512;
static unsigned int IMPDET_AVGLEN = 80;
static float IMPDET_CUTOFF = 3000 / 44100.;
static unsigned int IMPDET_NTAPS = 121;

std::vector<int> impulseDetect(float* source, int sourceLen){
  /* setup highpass filter */
  float h[IMPDET_NTAPS];
  float ft = estimate_req_filter_df(60, IMPDET_NTAPS);
  float bands[4] = { 0.0f, IMPDET_CUTOFF, IMPDET_CUTOFF + ft, 0.5f };
  float des[2] = { 0, 1 };
  float weights[2] = { 1.0f, 1.0f };
  liquid_firdespm_wtype wtype[2] = {LIQUID_FIRDESPM_FLATWEIGHT, LIQUID_FIRDESPM_FLATWEIGHT};
  firdespm_run(IMPDET_NTAPS,2,bands,des,weights,wtype,LIQUID_FIRDESPM_BANDPASS,h);
  firfilt_rrrf filter = firfilt_rrrf_create(h,IMPDET_NTAPS);

  std::vector<int> beats;  //output
  unsigned int winCount = (sourceLen / IMPDET_WINSIZE) - 1;
  std::list<float> lastMeans = { 1. };

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
    for(winSampleIndex=0;winSampleIndex<IMPDET_WINSIZE;winSampleIndex++){
      sampleValue = source[startSample + winSampleIndex];
      firfilt_rrrf_push(filter, sampleValue);   
      firfilt_rrrf_execute(filter, &sampleValue);
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
  firfilt_rrrf_destroy(filter);
  return beats;
}