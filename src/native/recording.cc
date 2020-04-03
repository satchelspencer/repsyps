#include "recording.h"

void allocateChunk(recording* recording){
  recordChunk* newChunk = new recordChunk{};
  for(int channelIndex=0;channelIndex<2;channelIndex++){
    float* channel = new float[REC_CHUNK_SAMPLES];
    newChunk->channels.push_back(channel);
  }
  newChunk->size = REC_CHUNK_SAMPLES;
  newChunk->used = 0;

  newChunk->bounds = new int[REC_CHUNK_BOUNDS];
  newChunk->boundsCount = 0;

  recording->chunks.push_back(newChunk);
}