#include "callback.h"

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
  unsigned long framesPerBuffer 
){
  int bufferChannelCount = buffer->channels.size();
  while(buffer->head != buffer->tail && outputFrameIndex < framesPerBuffer){
    for(int channelIndex=0;channelIndex<bufferChannelCount;channelIndex++){
      *out++ += buffer->channels[channelIndex][buffer->tail];
      buffer->channels[channelIndex][buffer->tail] = 0; //reset it to 0
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

  double mixTrackPhase;
  double phaseStep = 1/(double)state->playback->period;

  source* mixTrackSource;
  mixTrack* mixTrack;
  mixTrackSourceConfig* mixTrackSourceConfig;
  unsigned int mixTrackLength;
  int channelCount;
  int channelIndex;
  int chunkCount;
  int tempMixTrackChunkIndex;
  int tempMixTrackSample;
  bool didAdvancePlayback;
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
  copyToOut(state->buffer, out, outputFrameIndex, framesPerBuffer);

  /* keep computing new windows until we fill the output buffer */
  while(outputFrameIndex < framesPerBuffer){
    /* compute a new window by summing each track' output */
    for(auto mixTrackPair: state->mixTracks){
      mixTrack = mixTrackPair.second;
      bufferHead = state->buffer->head;
      
      mixTrackPlayback = mixTrack->playback;
      mixTrackPhase = getMixTrackPhase(state->playback, mixTrackPlayback);
      chunkCount = mixTrackPlayback->chunks.size()/2;

      if(chunkCount == 0 || !mixTrackPlayback->playing) continue;
      tempMixTrackChunkIndex = mixTrackPlayback->chunkIndex;
      tempMixTrackSample = mixTrack->sample;
      didAdvancePlayback = false;

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
              tempMixTrackChunkIndex = (tempMixTrackChunkIndex + 1) % chunkCount;
              if(mixTrack->hasNext && (tempMixTrackChunkIndex == 0 || mixTrackPlayback->nextAtChunk)){ //chunks looped and we have next
                didAdvancePlayback = true;
                mixTrackPlayback = mixTrack->nextPlayback;
                mixTrackPhase = getMixTrackPhase(state->playback, mixTrackPlayback);
                chunkCount = mixTrackPlayback->chunks.size()/2;
              }
              samplePosition = getSamplePosition(mixTrackPlayback,tempMixTrackChunkIndex, 0);
            }
          }
        }else{
          samplePosition = getSamplePosition(mixTrackPlayback,tempMixTrackChunkIndex, mixTrackPhase);
          if( samplePosition < tempMixTrackSample) {  /* check if we looped around */
            tempMixTrackChunkIndex = (tempMixTrackChunkIndex + 1) % chunkCount; //increment the chunk
            if(mixTrack->hasNext && (tempMixTrackChunkIndex == 0 || mixTrackPlayback->nextAtChunk)){ //chunks looped and we have next
              didAdvancePlayback = true;
              tempMixTrackChunkIndex = 0;
              mixTrackPlayback = mixTrack->nextPlayback;
              mixTrackPhase = getMixTrackPhase(state->playback, mixTrackPlayback);
              chunkCount = mixTrackPlayback->chunks.size()/2;
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
        }

        /* add sample to filterbuffer */ 
        for(auto sourcePair: *(mixTrackPlayback->sourceTracksParams)){
          if(state->sources.find(sourcePair.first) != state->sources.end()){
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
              }
              mixTrackSource->filterBuffers[channelIndex][frameIndex] = sampleValue;
            }   
          }
        }
        mixTrackPhase += phaseStep*mixTrackPlayback->alpha; 
      }/* end compute window */

      /* apply filters to full window */
      for(auto sourcePair: *(mixTrackPlayback->sourceTracksParams)){
        mixTrackSourceConfig = sourcePair.second;
        mixTrackSource = state->sources[sourcePair.first]; //key is sourceid
        channelCount = mixTrackSource->channels.size();

        for(channelIndex=0;channelIndex<channelCount;channelIndex++){
          for( frameIndex=0; frameIndex<state->windowSize; frameIndex++ ){
            if(mixTrack->hasFilter){
              firfilt_rrrf_push(mixTrack->filter, mixTrackSource->filterBuffers[channelIndex][frameIndex]);   
              firfilt_rrrf_execute(mixTrack->filter, &mixTrackSource->filterBuffers[channelIndex][frameIndex]);
            }
          }
        }
      }

      /* copy from filterbuffer to ringbuffer */
      for( frameIndex=0; frameIndex<state->windowSize; frameIndex++ ){
        for(auto sourcePair: *(mixTrackPlayback->sourceTracksParams)){
          mixTrackSource = state->sources[sourcePair.first]; //key is sourceid
          channelCount = mixTrackSource->channels.size();

          for(channelIndex=0;channelIndex<channelCount;channelIndex++){
            state->buffer->channels[channelIndex][bufferHead] += 
              mixTrackSource->filterBuffers[channelIndex][frameIndex] * state->window[frameIndex];
          }
        }
        bufferHead = (bufferHead+1)%state->buffer->size;
      }
    }
    //head only moves forward by half the window size
    state->buffer->head = (state->buffer->head + (state->windowSize/2)) % state->buffer->size;

    /* empty the ringbuffer into the output... again */
    out = (float*)outputBuffer;
    copyToOut(state->buffer, out, outputFrameIndex, framesPerBuffer);
  }
  
  state->playback->time += (double)framesPerBuffer/state->playback->period;

  /* phase wrapped drung this callback */
  if(startTime-floor(startTime) > state->playback->time-floor(state->playback->time)){
    for(auto mixTrackPair: state->mixTracks){
      mixTrack = mixTrackPair.second;
      if(mixTrack->hasNext && !mixTrack->playback->playing) applyNextPlayback(mixTrack);
    }
  }

  return paContinue;
}
