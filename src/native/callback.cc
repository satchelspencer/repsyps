#include "callback.h"

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

  double trackPhase;
  double phaseStep = 1/(double)state->playback->period;

  source* trackSource;
  track* track;
  unsigned int trackLength;
  int channelCount;
  int channelIndex;
  int chunkCount;
  int tempTrackChunkIndex;
  int tempTrackSample;

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
    for(auto trackPair: state->tracks){
      track = trackPair.second;
      bufferHead = state->buffer->head;

      trackPhase = state->playback->time*track->alpha;
      trackPhase -= floor(trackPhase); 

      trackSource = state->sources[track->sourceId];
      trackLength = trackSource->length;
      channelCount = trackSource->channels.size();
      chunkCount = track->chunks.size()/2;

      if(chunkCount == 0 || !track->playing) continue;
      
      tempTrackChunkIndex = track->chunkIndex;
      tempTrackSample = track->sample;

      /* add this computed track into the buffer */
      for( frameIndex=0; frameIndex<state->windowSize; frameIndex++ ){
        /* figure out which sample we're gonna fetch */
        if(tempTrackChunkIndex == -1 && trackPhase >= 0){
          tempTrackChunkIndex = 0;
          tempTrackSample = track->chunks[tempTrackChunkIndex*2]; //reset the sample to the start
        } //on first
        if(tempTrackChunkIndex == -1) break; //before we should be playing

        if(track->aperiodic){
          samplePosition = tempTrackSample + track->alpha;
          if(track->chunks[tempTrackChunkIndex*2+1] > 0){ //chunk has end
            if(samplePosition > track->chunks[tempTrackChunkIndex*2]+track->chunks[tempTrackChunkIndex*2+1]){
              tempTrackChunkIndex = (tempTrackChunkIndex + 1) % chunkCount;
              samplePosition = track->chunks[tempTrackChunkIndex*2];
            }
          }
        }else{
          samplePosition = track->chunks[tempTrackChunkIndex*2] + ( track->chunks[tempTrackChunkIndex*2+1] * trackPhase );
          if( samplePosition < tempTrackSample) {  /* check if we looped around */
            tempTrackChunkIndex = (tempTrackChunkIndex + 1) % chunkCount; //increment the chunk
            samplePosition = track->chunks[tempTrackChunkIndex*2] + ( track->chunks[tempTrackChunkIndex*2+1] * trackPhase );
          }
        }

        tempTrackSample = samplePosition; //casting back to int
        samplePositionFrac = samplePosition-floor(samplePosition);
        sampledFrameIndex = samplePosition;

        /* at the step point commit the mutated index and sample */
        if(frameIndex == state->windowSize/2 - 1){
          track->chunkIndex = tempTrackChunkIndex;
          track->sample = tempTrackSample;
        }


        /* add the sample to the buffer */
        for(channelIndex=0;channelIndex<channelCount;channelIndex++){
          sampleValue = 0;
          if(sampledFrameIndex >= 0 && sampledFrameIndex < trackLength-1 && track->volume > 0){
            sampleValue = trackSource->channels[channelIndex][sampledFrameIndex];
            sampleValueNext = trackSource->channels[channelIndex][sampledFrameIndex+1];
            sampleValue += (sampleValueNext-sampleValue)*samplePositionFrac; //linear interp
            sampleValue *= state->playback->volume;
            sampleValue *= track->volume;
            sampleValue *= state->window[frameIndex]; //multiply by the window
          }
          state->buffer->channels[channelIndex][bufferHead] += sampleValue;
        }       
        bufferHead = (bufferHead+1)%state->buffer->size;
        trackPhase += phaseStep*track->alpha;       
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
  return paContinue;
}
