#include "callback.h"
#include <iostream>

double getSamplePosition(
  mixTrackPlayback* playback,
  int chunkIndex,
  double phase
){
  return playback->chunks[chunkIndex*2] +
  ( playback->chunks[chunkIndex*2+1] * phase );
}

double getMixTrackPhase(
  playback* playback,
  mixTrackPlayback* mixTrackPlayback
){
  double mixTrackPhase = playback->time*mixTrackPlayback->alpha;
  mixTrackPhase -= floor(mixTrackPhase); 
  return mixTrackPhase;
}

void copyToOut(
  ringbuffer * buffer, 
  float * out, 
  unsigned int & outputFrameIndex,
  unsigned long framesPerBuffer,
  recording* rec 
){
  recordChunk* chunk = NULL;
  if(rec != NULL && rec->started) chunk = rec->chunks[rec->chunkIndex];

  int bufferChannelCount = buffer->channels.size();
  float sampleValue;
  while(buffer->head != buffer->tail && outputFrameIndex < framesPerBuffer){
    for(int channelIndex=0;channelIndex<bufferChannelCount;channelIndex++){
      sampleValue = buffer->channels[channelIndex][buffer->tail];
      *out++ += sampleValue;
      if(chunk) chunk->channels[channelIndex][chunk->used] += sampleValue;
      buffer->channels[channelIndex][buffer->tail] = 0; //reset buffer value to 0
    }
    if(chunk){
      chunk->used++;
      rec->length++;
      if(chunk->used >= chunk->size){ //chunkFilled
        rec->chunkIndex++;
        chunk = rec->chunks[rec->chunkIndex];
      } 
    }
    outputFrameIndex++;
    buffer->tail = (buffer->tail+1)%buffer->size;
  }
}

void applyNextPlayback(mixTrack * mixTrack){
  mixTrack->playback = mixTrack->nextPlayback;
  setMixTrackFilter(mixTrack, mixTrack->playback->filter);
  mixTrack->nextPlayback = NULL;
  mixTrack->hasNext = false;
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
  recording* rec = state->recording;
  recordChunk* currentChunk;

  double mixTrackPhase;
  double phaseStep = 1/(double)state->playback->period;

  source* mixTrackSource;
  mixTrack* mixTrack;
  mixTrackSourceConfig* mixTrackSourceConfig;
  unsigned int mixTrackLength;
  unsigned int channelCount;
  unsigned int channelIndex;
  unsigned int chunkCount;
  int tempMixTrackChunkIndex;
  double tempMixTrackSample;
  bool didAdvancePlayback;
  bool didPassBound;
  mixTrackPlayback* mixTrackPlayback;

  unsigned int sampledFrameIndex;
  unsigned int sourceTrackSampledFrameIndex;
  double samplePosition;
  double samplePositionFrac;
  float sampleValue;
  float sampleValueNext;

  int bufferHead;

  /* fill the output buffer with zeros */
  for( frameIndex=0; frameIndex<framesPerBuffer*2; frameIndex++ ) *out++ = 0;
  if(!state->playback->playing) return paContinue;

  /* empty the ringbuffer into the output, if available */
  out = (float*)outputBuffer;
  copyToOut(state->buffer, out, outputFrameIndex, framesPerBuffer, state->recording);

  /* keep computing new windows until we fill the output buffer */
  while(outputFrameIndex < framesPerBuffer){
    /* compute a new window by summing each track' output */
    for(auto mixTrackPair: state->mixTracks){
      mixTrack = mixTrackPair.second;
      if(!mixTrack) continue;
      bufferHead = state->buffer->head;
      
      mixTrackPlayback = mixTrack->playback;
      mixTrackPhase = getMixTrackPhase(state->playback, mixTrackPlayback);
      chunkCount = mixTrackPlayback->chunks.size()/2;

      if(chunkCount == 0 || !mixTrackPlayback->playing) continue;
      tempMixTrackChunkIndex = mixTrackPlayback->chunkIndex;
      tempMixTrackSample = mixTrack->sample;
      didAdvancePlayback = false;
      didPassBound = false;

      /* add this computed track into the buffer */
      for( frameIndex=0; frameIndex<state->windowSize; frameIndex++ ){
        /* figure out which sample we're gonna fetch */
        if(tempMixTrackChunkIndex == -1 && mixTrackPhase >= 0){
          tempMixTrackChunkIndex = 0;
          tempMixTrackSample = getSamplePosition(mixTrackPlayback, tempMixTrackChunkIndex, 0); //reset the sample to the start
        } //on first
        if(tempMixTrackChunkIndex == -1) break; //before we should be playing

        if(mixTrackPlayback->aperiodic){
          samplePosition = tempMixTrackSample + mixTrackPlayback->alpha;
          if(mixTrackPlayback->chunks[tempMixTrackChunkIndex*2+1] > 0){ //chunk has end
            if(samplePosition > getSamplePosition(mixTrackPlayback, tempMixTrackChunkIndex, 1)){ /* check if we looped around */
              didPassBound = true;
              tempMixTrackChunkIndex = (tempMixTrackChunkIndex + 1) % chunkCount;
              if(mixTrack->hasNext && (tempMixTrackChunkIndex == 0 || mixTrackPlayback->nextAtChunk)){ //chunks looped and we have next
                didAdvancePlayback = true;
                mixTrackPlayback = mixTrack->nextPlayback;
                mixTrackPhase = getMixTrackPhase(state->playback, mixTrackPlayback);
                chunkCount = mixTrackPlayback->chunks.size()/2;
              }
              if(!didAdvancePlayback && tempMixTrackChunkIndex == 0 && !mixTrackPlayback->loop){
                mixTrackPlayback->playing = false;
                mixTrackPlayback->chunkIndex = -1;
                break;
              }
              samplePosition = getSamplePosition(mixTrackPlayback,tempMixTrackChunkIndex, 0);
            }
          }
        }else{
          samplePosition = getSamplePosition(mixTrackPlayback,tempMixTrackChunkIndex, mixTrackPhase);
          if( samplePosition < tempMixTrackSample) {  /* check if we looped around */
            didPassBound = true;
            tempMixTrackChunkIndex = (tempMixTrackChunkIndex + 1) % chunkCount; //increment the chunk
            if(mixTrack->hasNext && (tempMixTrackChunkIndex == 0 || mixTrackPlayback->nextAtChunk)){ //chunks looped and we have next
              didAdvancePlayback = true;
              tempMixTrackChunkIndex = 0;
              mixTrackPlayback = mixTrack->nextPlayback;
              mixTrackPhase = getMixTrackPhase(state->playback, mixTrackPlayback);
              chunkCount = mixTrackPlayback->chunks.size()/2;
            }
            if(!didAdvancePlayback && tempMixTrackChunkIndex == 0 && !mixTrackPlayback->loop){
              mixTrackPlayback->playing = false;
              mixTrackPlayback->chunkIndex = -1;
              break;
            }
            samplePosition = getSamplePosition(mixTrackPlayback, tempMixTrackChunkIndex, mixTrackPhase);
          }
        }

        tempMixTrackSample = samplePosition; //casting back to int
        samplePositionFrac = samplePosition-floor(samplePosition);
        sampledFrameIndex = samplePosition;

        /* at the step point commit the mutated index and sample */
        if(frameIndex == state->windowSize/2 - 1){
          mixTrack->playback->chunkIndex = tempMixTrackChunkIndex;
          mixTrack->sample = tempMixTrackSample;
          if(didAdvancePlayback){
            applyNextPlayback(mixTrack);
            didAdvancePlayback = false;
          }
          /* start a synced trak from source on the boundary */
          if(
            rec != NULL 
            && (didPassBound || mixTrackPlayback->aperiodic)
            && rec->fromSource 
            && !rec->started
            && rec->fromSourceId == mixTrackPair.first
          ){
            rec->started = true;
            rec->fromSourceOffset = tempMixTrackSample;
          }
        }
                
        /* add sample to filterbuffer */ 
        for(auto sourcePair: mixTrackPlayback->sourceTracksParams){
          if(state->sources.find(sourcePair.first) != state->sources.end() && state->sources[sourcePair.first] != NULL){
            mixTrackSource = state->sources[sourcePair.first]; //key is sourceid
            mixTrackSourceConfig = sourcePair.second;
            mixTrackLength = mixTrackSource->length;
            channelCount = mixTrackSource->channels.size();
            sourceTrackSampledFrameIndex = sampledFrameIndex - mixTrackSourceConfig->offset;

            /* add the sample to the buffer */
            for(channelIndex=0;channelIndex<channelCount;channelIndex++){
              sampleValue = 0;
              if(
                sourceTrackSampledFrameIndex >= 0 &&
                sourceTrackSampledFrameIndex < mixTrackLength-1 &&
                mixTrackSourceConfig->volume > 0 && 
                !mixTrackPlayback->muted
              ){
                sampleValue = 
                  mixTrackSource->channels[channelIndex][sourceTrackSampledFrameIndex];
                sampleValueNext = 
                  mixTrackSource->channels[channelIndex][sourceTrackSampledFrameIndex + 1];
                sampleValue += (sampleValueNext-sampleValue)*samplePositionFrac; //linear interp
                sampleValue *= state->playback->volume;
                sampleValue *= mixTrackSourceConfig->volume;

                sampleValue *= mixTrackPlayback->volume;
                if(mixTrack->hasFilter){
                  firfilt_rrrf_push(mixTrack->filter, sampleValue);   
                  firfilt_rrrf_execute(mixTrack->filter, &sampleValue);
                }
                sampleValue *= state->window[frameIndex];                
              }
              state->buffer->channels[channelIndex][bufferHead] += sampleValue;
            }   
          }
        }
        bufferHead = (bufferHead+1)%state->buffer->size;
        mixTrackPhase += phaseStep*mixTrackPlayback->alpha; 
      }/* end compute window */
    }

    //head only moves forward by half the window size
    state->buffer->head = (state->buffer->head + (state->windowSize/2)) % state->buffer->size;

    /* empty the ringbuffer into the output... again */
    out = (float*)outputBuffer;
    copyToOut(state->buffer, out, outputFrameIndex, framesPerBuffer, state->recording);
  }
  
  state->playback->time += (double)framesPerBuffer/state->playback->period;
  /* phase wrapped drung this callback */
  if(startTime-floor(startTime) > state->playback->time-floor(state->playback->time)){
    for(auto mixTrackPair: state->mixTracks){
      mixTrack = mixTrackPair.second;
      if(
        mixTrack && 
        mixTrack->hasNext && 
        (!mixTrack->playback->playing || mixTrack->playback->aperiodic)
      ) applyNextPlayback(mixTrack);
    }
    if(state->recording != NULL){
      if(!state->recording->started && !rec->fromSource) state->recording->started = true;
      currentChunk = state->recording->chunks[state->recording->chunkIndex];
      currentChunk->bounds[currentChunk->boundsCount] = state->recording->length;
      currentChunk->boundsCount++;
    }
  }

  for(auto sourcesPair: state->sources){
    mixTrackSource = sourcesPair.second;
    if(mixTrackSource && mixTrackSource->removed){
      if(REPSYS_LOG) std::cout << "free source" << std::endl;
      if(mixTrackSource->data != NULL){
        av_freep(&mixTrackSource->data[0]);
        av_freep(&mixTrackSource->data);
      }else{
        for(channelIndex=0;channelIndex<mixTrackSource->channels.size();channelIndex++){
          delete [] mixTrackSource->channels[channelIndex];
        }
      }
      state->sources[sourcesPair.first] = NULL;
      delete mixTrackSource;
    }
  }

  for(auto mixTrackPair: state->mixTracks){
    mixTrack = mixTrackPair.second;
    if(mixTrack && mixTrack->removed){
      if(REPSYS_LOG) std::cout << "free track" << std::endl;
      state->mixTracks[mixTrackPair.first] = NULL;
      if(mixTrack->filter != NULL) firfilt_rrrf_destroy(mixTrack->filter);
      delete mixTrack;
    }
  }

  return paContinue;
}
