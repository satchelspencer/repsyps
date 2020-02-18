#include "callback.h"

double getSamplePosition(
  std::vector<int> * chunks,
  int chunkIndex,
  double phase
){
  return (*chunks)[chunkIndex*2] + ( (*chunks)[chunkIndex*2+1] * phase );
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
  unsigned long frameIndex;
  unsigned int outputFrameIndex = 0;
  double startTime = state->playback->time;

  double mixTrackPhase;
  double phaseStep = 1/(double)state->playback->period;

  source* mixTrackSource;
  mixTrack* mixTrack;
  mixTrackSourceConfig* mixTrackSourceConfig;
  unsigned int mixTrackLength;
  int channelCount;
  int channelIndex;
  int chunkCount;
  int nextChunkCount;
  int tempMixTrackChunkIndex;
  int tempMixTrackSample;
  bool tempMixTrackAdvancedChunks;
  std::vector<int> * tempMixTrackChunks;

  unsigned int sampledFrameIndex;
  double samplePosition;
  double samplePositionFrac;
  float sampleValue;
  float sampleValueNext;

  int bufferChannelCount = state->buffer->channels.size();
  int bufferHead;

  /* fill the output buffer with zeros */
  for( frameIndex=0; frameIndex<framesPerBuffer*2; frameIndex++ ) *out++ = 0;
  if(!state->playback->playing) return paContinue;

  /* empty the ringbuffer into the output, if available */
  out = (float*)outputBuffer;
  while(state->buffer->head != state->buffer->tail && outputFrameIndex < framesPerBuffer){
    for(channelIndex=0;channelIndex<bufferChannelCount;channelIndex++){
      *out++ += state->buffer->channels[channelIndex][state->buffer->tail];
      state->buffer->channels[channelIndex][state->buffer->tail] = 0; //reset it to 0
    }
    outputFrameIndex++;
    state->buffer->tail = (state->buffer->tail+1)%state->buffer->size;
  }

  /* keep computing new windows until we fill the output buffer */
  while(outputFrameIndex < framesPerBuffer){
    /* compute a new window by summing each track' output */
    for(auto mixTrackPair: state->mixTracks){
      mixTrack = mixTrackPair.second;
      bufferHead = state->buffer->head;

      mixTrackPhase = state->playback->time*mixTrack->alpha;
      mixTrackPhase -= floor(mixTrackPhase); 

      chunkCount = mixTrack->chunks.size()/2;
      nextChunkCount = mixTrack->nextChunks.size()/2;

      if(chunkCount == 0 || !mixTrack->playing) continue;
      
      tempMixTrackChunkIndex = mixTrack->chunkIndex;
      tempMixTrackSample = mixTrack->sample;
      tempMixTrackAdvancedChunks = false;
      tempMixTrackChunks = &mixTrack->chunks;

      /* add this computed track into the buffer */
      for( frameIndex=0; frameIndex<state->windowSize; frameIndex++ ){
        /* figure out which sample we're gonna fetch */
        if(tempMixTrackChunkIndex == -1 && mixTrackPhase >= 0){
          tempMixTrackChunkIndex = 0;
          tempMixTrackSample = getSamplePosition(tempMixTrackChunks, tempMixTrackChunkIndex, 0); //reset the sample to the start
        } //on first
        if(tempMixTrackChunkIndex == -1) break; //before we should be playing

        if(mixTrack->aperiodic){
          samplePosition = tempMixTrackSample + mixTrack->alpha;
          if((*tempMixTrackChunks)[tempMixTrackChunkIndex*2+1] > 0){ //chunk has end
            if(samplePosition > getSamplePosition(tempMixTrackChunks, tempMixTrackChunkIndex, 1)){ /* check if we looped around */
              tempMixTrackChunkIndex = (tempMixTrackChunkIndex + 1) % chunkCount;
              if(nextChunkCount > 0 && (tempMixTrackChunkIndex == 0 || mixTrack->nextAtChunk)){ //chunks looped and we have nextChunks
                tempMixTrackAdvancedChunks = true;
                tempMixTrackChunks = &mixTrack->nextChunks;
              }
              samplePosition = (*tempMixTrackChunks)[tempMixTrackChunkIndex*2];
            }
          }
        }else{
          samplePosition = getSamplePosition(tempMixTrackChunks, tempMixTrackChunkIndex, mixTrackPhase);
          if( samplePosition < tempMixTrackSample) {  /* check if we looped around */
            tempMixTrackChunkIndex = (tempMixTrackChunkIndex + 1) % chunkCount; //increment the chunk
            if(nextChunkCount > 0 && (tempMixTrackChunkIndex == 0 || mixTrack->nextAtChunk)){ //chunks looped and we have nextChunks
              tempMixTrackChunkIndex = 0;
              tempMixTrackAdvancedChunks = true;
              tempMixTrackChunks = &mixTrack->nextChunks;
            }
            samplePosition = getSamplePosition(tempMixTrackChunks, tempMixTrackChunkIndex, mixTrackPhase);
          }
        }

        tempMixTrackSample = samplePosition; //casting back to int
        samplePositionFrac = samplePosition-floor(samplePosition);
        sampledFrameIndex = samplePosition;

        /* at the step point commit the mutated index and sample */
        if(frameIndex == state->windowSize/2 - 1){
          mixTrack->chunkIndex = tempMixTrackChunkIndex;
          mixTrack->sample = tempMixTrackSample;
          if(tempMixTrackAdvancedChunks){
            mixTrack->chunks = mixTrack->nextChunks;
            mixTrack->nextChunks.clear();
            tempMixTrackAdvancedChunks = false;
            tempMixTrackChunks = &mixTrack->chunks;
          }
        }

        for(auto sourcePair: mixTrack->sources){
          mixTrackSourceConfig = sourcePair.second;
          mixTrackSource = state->sources[sourcePair.first]; //key is sourceid
          mixTrackLength = mixTrackSource->length;
          channelCount = mixTrackSource->channels.size();

          /* add the sample to the buffer */
          for(channelIndex=0;channelIndex<channelCount;channelIndex++){
            sampleValue = 0;
            if(
              sampledFrameIndex >= 0 &&
              sampledFrameIndex < mixTrackLength-1 &&
              mixTrackSourceConfig->volume > 0 && 
              !mixTrack->muted
            ){
              sampleValue = mixTrackSource->channels[channelIndex][sampledFrameIndex];
              sampleValueNext = mixTrackSource->channels[channelIndex][sampledFrameIndex+1];
              sampleValue += (sampleValueNext-sampleValue)*samplePositionFrac; //linear interp
              sampleValue *= state->playback->volume;
              sampleValue *= mixTrackSourceConfig->volume;
              sampleValue *= state->window[frameIndex]; //multiply by the window
            }
            state->buffer->channels[channelIndex][bufferHead] += sampleValue;
          }   
        }

        bufferHead = (bufferHead+1)%state->buffer->size;
        mixTrackPhase += phaseStep*mixTrack->alpha;       
      }
    }
    //head only moves forward by half the window size
    state->buffer->head = (state->buffer->head + (state->windowSize/2)) % state->buffer->size;

    /* empty the ringbuffer into the output... again */
    out = (float*)outputBuffer;
    while(outputFrameIndex < framesPerBuffer){
      for(channelIndex=0;channelIndex<bufferChannelCount;channelIndex++){
        *out++ += state->buffer->channels[channelIndex][state->buffer->tail];
        state->buffer->channels[channelIndex][state->buffer->tail] = 0;
      }
      outputFrameIndex++;
      state->buffer->tail = (state->buffer->tail+1)%state->buffer->size;
    }
  }
  
  state->playback->out = state->buffer->tail;
  state->playback->time += (double)framesPerBuffer/state->playback->period;

  /* phase wrapped drung this callback */
  if(startTime-floor(startTime) > state->playback->time-floor(state->playback->time)){
    for(auto mixTrackPair: state->mixTracks){
      mixTrack = mixTrackPair.second;
      if(mixTrack->nextChunks.size() > 0 && !mixTrack->playing){
        mixTrack->chunks = mixTrack->nextChunks;
        mixTrack->nextChunks.clear();
        mixTrack->playing = true;
      }
    }
  }

  return paContinue;
}
