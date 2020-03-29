#include "waveform.h"

void minMaxWaveform(
  float scale,
  int start,
  float* source,
  int sourceLen,
  float* dest, 
  int destLen
){
  int width = destLen / 2; 
  int skip = (scale / 100) + 1;

  int fstart;
  int fend;
  float min;
  float max;
  int sample;
  float sampleVal = 0;
  for(int i=0;i<width;i++){
    fstart = i*scale + start;
    fend = fstart + scale;
    min = 0;
    max = 0;
    for(sample=fstart;sample<fend;sample+=skip){
      if(sample > 0 && sample < sourceLen){
        sampleVal = source[sample] * 0.75;
        if(sampleVal > 0 && sampleVal > max) max = sampleVal;
        if(sampleVal < 0 && sampleVal < min) min = sampleVal;
      }
    }
    dest[i*2] = min;
    dest[i*2 + 1] = max;
  }
}