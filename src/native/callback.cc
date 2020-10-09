#include "callback.h"
#include <iostream>

int getAvailable(ringbuffer* buffer){
  if(buffer->head >= buffer->tail) return buffer->head - buffer->tail;
  else return buffer->head + (buffer->size - buffer->tail);
}

void applyNextPlayback(std::string mixTrackId, streamState* state){
  mixTrack* mixTrack = state->mixTracks[mixTrackId];
  mixTrack->playback = mixTrack->nextPlayback;
  mixTrack->nextPlayback = NULL;
  mixTrack->hasNext = false;
}

double getSamplePosition(
  mixTrackPlayback* playback,
  const double& phase
){
  return playback->chunks[playback->chunkIndex*2] +
  ( playback->chunks[playback->chunkIndex*2+1] * phase );
}

int normModSize(const int & x, const int & size){
return (x + size + size) % size;
}

int moddiff(const int & x, const int & y, const int & size){
  int diff = (normModSize(x, size)-normModSize(y, size)+size)%size;
  return diff > (size/2)?size-diff:diff;
}

int paCallbackMethod(
  const void *inputBuffer, 
  void *outputBuffer,
  unsigned long framesPerBuffer,
  const PaStreamCallbackTimeInfo* timeInfo,
  PaStreamCallbackFlags statusFlags,
  void *userData
){
  streamState *state = (streamState*)userData;
  float *out = (float*)outputBuffer;
  recording* rec = state->recording;
  double startTime = state->playback->time;

  for(unsigned int frameIndex=0; frameIndex<framesPerBuffer*2; frameIndex++ ) *(out+frameIndex) = 0;
  if(!state->playback->playing) return paContinue;

  int previewHead = state->previewBuffer->head;

  for(auto mixTrackPair: state->mixTracks){
    mixTrack* mixTrack = mixTrackPair.second;
    if(
      !mixTrack || mixTrack->removed || mixTrack->safe ||
      !mixTrack->playback->playing || mixTrack->playback->chunks.size() == 0
    ) continue;
    Stretcher* stretcher;
    if(mixTrack->playback->preservePitch) stretcher = mixTrack->pvstretcher;
    else stretcher = mixTrack->restretcher;

    int stretcherAvailable = stretcher->getAvailable();

    while(stretcherAvailable < framesPerBuffer){
      /* read from source >> inputbuffer */
      int needed = stretcher->getRequired();
      int readAvailable = getAvailable(mixTrack->inputBuffer);

      while(readAvailable < needed){
        mixTrackPlayback* playback = mixTrack->playback;
        double samplesOffset = stretcherAvailable + (readAvailable * stretcher->getTimeRatio());
        double trackTime = state->playback->time + (samplesOffset / state->playback->period);
        double mixTrackPhase = playback->alpha * trackTime;
        mixTrackPhase -= floor(mixTrackPhase);
        int chunkCount = playback->chunks.size()/2;

        if(chunkCount == 0 || !playback->playing) continue;
        if(playback->chunkIndex == -1){
          playback->chunkIndex = 0;
          mixTrack->sample = getSamplePosition(playback, 0);
        }

        int chunkLength = playback->chunks[(playback->chunkIndex * 2) + 1];
        bool hasEnd = chunkLength != 0;
        bool periodic = hasEnd && !playback->aperiodic;
        double chunkEndPosition = getSamplePosition(playback, 1);
        bool hasNext = mixTrack->hasNext && (playback->chunkIndex == 0 || playback->nextAtChunk);
        int nextChunkIndex = (playback->chunkIndex + 1) % chunkCount;
        double nextChunkStart = hasNext ?
          mixTrack->nextPlayback->chunks[0] : 
          playback->chunks[nextChunkIndex * 2];

        float invAlpha = periodic ?
          chunkLength / (float)state->playback->period * playback->alpha :
          playback->alpha;
        float alpha = 1 / invAlpha;

        stretcher->setTimeRatio(alpha);
        //stretcher->setPitchRatio(invAlpha);

        if(periodic){
          double trueSamplePos = getSamplePosition(playback, mixTrackPhase);
          int sampleDelta = moddiff(trueSamplePos, mixTrack->sample, chunkLength);
          if(abs(sampleDelta) > 1024){
            mixTrack->sample = trueSamplePos;
            //std::cout << "cr " << sampleDelta << std::endl;
          }
        }
       
        for(auto sourcePair: playback->sourceTracksParams){
          if(!( //skip destroyed sources
            state->sources.find(sourcePair.first) != state->sources.end() 
            && state->sources[sourcePair.first] != NULL
            && !state->sources[sourcePair.first]->safe
          )) continue;

          mixTrackSourceConfig* params = sourcePair.second;
          source* source = state->sources[sourcePair.first];
          int length = source->length;
          int sourcePos = mixTrack->sample - params->offset;

          int head = mixTrack->inputBuffer->head;
          for(int inputIndex=0;inputIndex<WINDOW_SIZE;inputIndex++){
            for(int channelIndex=0;channelIndex < CHANNEL_COUNT;channelIndex++){
              int pos = sourcePos + inputIndex;
              float sampleValue = (pos < length && pos >= 0) ? source->channels[channelIndex][pos] : 0;
              sampleValue *= params->volume; //mix it before input
              sampleValue *= state->window[inputIndex];
              mixTrack->inputBuffer->channels[channelIndex][head] += sampleValue;
            }
            head = (head + 1) % mixTrack->inputBuffer->size;
          }
        }

        mixTrack->inputBuffer->head = (mixTrack->inputBuffer->head + WINDOW_STEP) % mixTrack->inputBuffer->size;
        int nextReadAvailable = getAvailable(mixTrack->inputBuffer);
        if(nextReadAvailable == readAvailable) break;
        readAvailable = nextReadAvailable;
        
        mixTrack->sample += WINDOW_STEP;
        if(hasEnd && mixTrack->sample > chunkEndPosition){ //chunk boundary
          playback->chunkIndex = (playback->chunkIndex + 1) % chunkCount;
          if(!mixTrack->hasNext && playback->chunkIndex == 0 && !playback->loop){
            playback->playing = false;
            playback->chunkIndex = -1;
          }else{
            mixTrack->sample = nextChunkStart + (mixTrack->sample - chunkEndPosition); //???????????
            if(mixTrack->hasNext && (playback->chunkIndex == 0 || playback->nextAtChunk)){
              applyNextPlayback(mixTrackPair.first, state);
              playback->chunkIndex = 0;
            } 
            if(rec != NULL && rec->fromSourceId == mixTrackPair.first && !rec->started){
              rec->started = true;
              rec->fromSourceOffset = chunkEndPosition;
            }
          }
        }
      }

      /* inputbuffer >> stretchInput */
      for(int inputIndex=0;inputIndex<needed;inputIndex++){
        for(int channelIndex=0;channelIndex < CHANNEL_COUNT;channelIndex++){
          mixTrack->stretchInput[channelIndex][inputIndex] = 
            mixTrack->inputBuffer->channels[channelIndex][mixTrack->inputBuffer->tail];
          mixTrack->inputBuffer->channels[channelIndex][mixTrack->inputBuffer->tail] = 0;
        }
        mixTrack->inputBuffer->tail = (mixTrack->inputBuffer->tail + 1) % mixTrack->inputBuffer->size;
      }

      /* apply effects chain here? */
      mixTrack->filter->process(needed, mixTrack->stretchInput);

      /* stretchInput >> stretchOutput */
      stretcher->process(mixTrack->stretchInput, needed);
      int nextStretcherAvailable = stretcher->getAvailable();
      if(nextStretcherAvailable == stretcherAvailable) break;
      stretcherAvailable = nextStretcherAvailable;
    }
  
    /* stretchOutput >> paOutput */
    float desiredGain = mixTrack->playback->volume * state->playback->volume;
    if(mixTrack->playback->muted) desiredGain = 0;
    float gainStep = (desiredGain - mixTrack->gain) / WINDOW_SIZE;

    if(stretcherAvailable >= framesPerBuffer){
      stretcher->retrieve(mixTrack->stretchOutput, framesPerBuffer);
      float* output = (float*)outputBuffer;
      int trackPreviewHead = previewHead;
      for(int frameIndex=0;frameIndex<framesPerBuffer;frameIndex++){
        for(int channelIndex=0;channelIndex < CHANNEL_COUNT;channelIndex++){
          float sampleValue = mixTrack->stretchOutput[channelIndex][frameIndex];
          if(mixTrack->playback->preview)
            state->previewBuffer->channels[channelIndex][trackPreviewHead] += sampleValue;

          *output++ += sampleValue * mixTrack->gain;
        }
        mixTrack->gain = mixTrack->gain + gainStep;
        trackPreviewHead = (trackPreviewHead + 1) % state->previewBuffer->size;
      }
    }
    
  }

  state->previewBuffer->head = (state->previewBuffer->head + framesPerBuffer) % state->previewBuffer->size;
  
  /* update time and misc */
  state->playback->time = startTime + ((double)framesPerBuffer / state->playback->period);

  /* phase wrapped drung this callback */
  if(startTime-floor(startTime) > state->playback->time-floor(state->playback->time)){
    /* unpause any tracks as needed */
    for(auto mixTrackPair: state->mixTracks){
      mixTrack* mixTrack = mixTrackPair.second;
      if(
        mixTrack && 
        !mixTrack->removed &&
        mixTrack->hasNext && 
        (!mixTrack->playback->playing || mixTrack->playback->aperiodic) && 
        mixTrack->playback->unpause
      ) applyNextPlayback(mixTrackPair.first, state);
    }
    /* add bounds to recording */
    if(rec != NULL){
      if(!rec->started && !rec->fromSource) rec->started = true;
      recordChunk* currentChunk = rec->chunks[rec->chunkIndex];
      currentChunk->bounds[currentChunk->boundsCount] = rec->length;
      currentChunk->boundsCount++;
    }
  }

  for(auto sourcesPair: state->sources){
    source* mixTrackSource = sourcesPair.second;
    if(mixTrackSource && mixTrackSource->removed && !mixTrackSource->safe){
      if(REPSYS_LOG) std::cout << "safe source " << sourcesPair.first << std::endl;
      mixTrackSource->safe = true;
    }
  }

  for(auto mixTrackPair: state->mixTracks){
    mixTrack* mixTrack = mixTrackPair.second;
    if(mixTrack && mixTrack->removed && !mixTrack->safe){
      if(REPSYS_LOG) std::cout << "safe track" << mixTrackPair.first << std::endl;
      mixTrack->safe = true;
    }
  }
  return paContinue;
}

int paPreviewCallbackMethod(
  const void *inputBuffer, 
  void *outputBuffer,
  unsigned long framesPerBuffer,
  const PaStreamCallbackTimeInfo* timeInfo,
  PaStreamCallbackFlags statusFlags,
  void *userData
){
  streamState *state = (streamState*)userData;
  float *out = (float*)outputBuffer;
  //unsigned int outputFrameIndex = 0;

  for(unsigned int frameIndex=0; frameIndex<framesPerBuffer*2; frameIndex++ ) *(out+frameIndex) = 0;
  if(
    !state->previewing ||
    getAvailable(state->previewBuffer) < framesPerBuffer
  ) return paContinue;
  
  int previewTail = state->previewBuffer->tail;
  for(int frameIndex=0;frameIndex<framesPerBuffer;frameIndex++){
    for(int channelIndex=0;channelIndex < CHANNEL_COUNT;channelIndex++){
      *out++ = state->previewBuffer->channels[channelIndex][previewTail];
      state->previewBuffer->channels[channelIndex][previewTail] = 0;
    }
    previewTail = (previewTail + 1) % state->previewBuffer->size;
  }
  state->previewBuffer->tail = previewTail;

  return paContinue;
}