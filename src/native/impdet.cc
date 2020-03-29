#include "impdet.h"

std::vector<int> impulseDetect(float* source, int sourceLen){
  std::vector<int> beats;
  unsigned int fftSize = 256;
  unsigned int bandMin = (6000 / 44100.) * fftSize;
  unsigned int bandMax = (20000 / 44100.) * fftSize;
  unsigned int avgLength = 40;
  unsigned int thresh = 4;
  float epsilon = 0.000001;
  liquid_float_complex * x = new liquid_float_complex[fftSize];
  liquid_float_complex * y = new liquid_float_complex[fftSize];
  fftplan pf = fft_create_plan(fftSize, x, y, LIQUID_FFT_FORWARD,  0);

  unsigned int fftCount = (sourceLen / fftSize) - 1;
  unsigned int startSample;
  unsigned int fftSampleIndex;

  float mean;
  std::list<float> lastMeans = { 1. };
  std::list<float> lastFracs = { 1. };
  float meansAvg;
  float fracsAvg;
  float frac;
  float fracfrac;
  bool inBeat;
  float beatMax;
  unsigned int beatMaxIndex;

  float sum;
  unsigned int count;
  unsigned int bandIndex;

  for(unsigned int fftIndex=0;fftIndex<fftCount;fftIndex++){
    startSample = fftIndex * fftSize;
    for(fftSampleIndex=0;fftSampleIndex<fftSize;fftSampleIndex++)
      x[fftSampleIndex] = source[startSample + fftSampleIndex];
    fft_execute(pf);

    sum = 0;
    count = 0;
    for(bandIndex = bandMin;bandIndex<bandMax;bandIndex++){
      sum += std::norm(y[bandIndex]);
      count++;
    }
    mean = sum / count;

    meansAvg = epsilon;
    for(float v : lastMeans) meansAvg += v;
    meansAvg /= lastMeans.size();
    frac = mean / meansAvg;
    lastMeans.push_front(frac);
    if(lastMeans.size() > avgLength) lastMeans.pop_back();

    fracsAvg = epsilon;
    for(float v : lastFracs) fracsAvg += v;
    fracsAvg /= lastFracs.size();
    fracfrac = frac / fracsAvg;
    lastFracs.push_front(frac);
    if(lastFracs.size() > avgLength) lastFracs.pop_back();

    if(fracfrac > thresh && frac > 2){
      if(!inBeat){
        inBeat = true;
        beatMax = 0;
        beatMaxIndex = 0;
      }
      if(fracfrac > beatMax){
        beatMax = fracfrac;
        beatMaxIndex = fftIndex;
      }
    }else if(inBeat){
      inBeat = false;
      beats.push_back(beatMaxIndex * fftSize);
    }
  }
  fft_destroy_plan(pf);
  return beats;
}