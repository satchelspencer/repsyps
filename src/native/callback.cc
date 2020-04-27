#include "callback.h"
#include <iostream>

double getMixTrackPhase(
  playback* playback,
  float alpha
){
  double mixTrackPhase = playback->time * alpha;
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
      *out++ = sampleValue;
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

double getSamplePosition(
  mixTrackPlayback* playback,
  double phase
){
  return playback->chunks[playback->chunkIndex*2] +
  ( playback->chunks[playback->chunkIndex*2+1] * phase );
}

void applyFilter(
  float& sampleValue,
  mixTrackPlayback* playback,
  mixTrack* mixTrack,
  mixTrackSourceConfig* params,
  streamState *state,
  int outBufferHead,
  int channelIndex
){
  sampleValue *= params->volume;
  sampleValue *= mixTrack->playback->volume;
  sampleValue *= state->playback->volume;
  if(mixTrack->hasFilter && mixTrack->filters[mixTrack->overlapIndex] != NULL){
    firfilt_rrrf_push(mixTrack->filters[mixTrack->overlapIndex], sampleValue);   
    firfilt_rrrf_execute(mixTrack->filters[mixTrack->overlapIndex], &sampleValue);
  }
  state->buffer->channels[channelIndex][outBufferHead] += sampleValue;
}

static liquid_float_complex * x = new liquid_float_complex[PV_WINDOW_SIZE];
static liquid_float_complex * y = new liquid_float_complex[PV_WINDOW_SIZE];
static liquid_float_complex * z = new liquid_float_complex[PV_WINDOW_SIZE];
static fftplan pf = fft_create_plan(PV_WINDOW_SIZE, x, y, LIQUID_FFT_FORWARD,  0);
static fftplan pr = fft_create_plan(PV_WINDOW_SIZE, y, z, LIQUID_FFT_BACKWARD,  0);

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
  double time = state->playback->time;
  unsigned int outputFrameIndex = 0;

  copyToOut(state->buffer, out, outputFrameIndex, framesPerBuffer, rec);

  while(outputFrameIndex < framesPerBuffer){
    for(auto mixTrackPair: state->mixTracks){
      mixTrack* mixTrack = mixTrackPair.second;
      if(!mixTrack || mixTrack->removed) continue;

      mixTrackPlayback* playback = mixTrack->playback;
      float trackAlpha = playback->alpha;
      double mixTrackPhase = trackAlpha * time;
      mixTrackPhase -= floor(mixTrackPhase);
      int chunkIndex = playback->chunkIndex;
      int chunkCount = playback->chunks.size()/2;
      
      if(chunkCount == 0 || !playback->playing) continue;
      if(chunkIndex == -1){
        mixTrack->playback->chunkIndex = 0;
        chunkIndex = 0;
        mixTrack->sample = getSamplePosition(playback, 0);
      }

      double trackStartPosition = playback->aperiodic ? mixTrack->sample : getSamplePosition(playback, mixTrackPhase);
      double chunkEndPosition = getSamplePosition(playback, 1);
      int chunkLength = playback->chunks[(chunkIndex * 2) + 1];
      bool hasEnd = chunkLength != 0;
      int nextChunkIndex = (chunkIndex + 1) % chunkCount;
      bool hasNext = mixTrack->hasNext && (chunkIndex == 0 || playback->nextAtChunk);
      double nextChunkStart = hasNext ?
        mixTrack->nextPlayback->chunks[0] : 
        playback->chunks[nextChunkIndex * 2];
      bool committedStep = false;
      float alpha = (hasEnd && !playback->aperiodic) ?
        chunkLength / (float)state->playback->period * trackAlpha :
        trackAlpha;

      for(auto sourcePair: playback->sourceTracksParams){
        if(
          state->sources.find(sourcePair.first) != state->sources.end() 
          && state->sources[sourcePair.first] != NULL
        ){
          mixTrackSourceConfig* params = sourcePair.second;
          source* source = state->sources[sourcePair.first];
          int length = source->length;

          for(int channelIndex=0;channelIndex < CHANNEL_COUNT;channelIndex++){
            double trackPosition = trackStartPosition - params->offset;
            int outBufferHead = state->buffer->head;
            playback = mixTrack->playback;
            double positionFrac = trackPosition-floor(trackPosition);

            /* PV */
            // int pvOverlap = 4;
            // int pvSubwindows = pvOverlap/OVERLAP_COUNT;
            // float analysisStep = WINDOW_STEP / pvSubwindows;
            // for(int pvWindow=0;pvWindow < pvSubwindows;pvWindow++){
            //   outBufferHead = state->buffer->head + (pvWindow * analysisStep);
            //   for(int pvWinIndex=0;pvWinIndex < PV_WINDOW_SIZE;pvWinIndex++){
            //     x[pvWinIndex] = source->channels[channelIndex][(int)trackPosition + pvWinIndex];
            //   }
            //   fft_execute(pf);
            //   //process... maaaagic
            //   fft_execute(pr);
            //   for(int pvWinIndex=0;pvWinIndex < PV_WINDOW_SIZE;pvWinIndex++){
            //     float sampleValue = z[pvWinIndex].real() * state->pvWindow[pvWinIndex] / pvSubwindows;
            //     applyFilter(sampleValue, playback, mixTrack, params, state, outBufferHead, channelIndex);
            //     outBufferHead = (outBufferHead + 1) % state->buffer->size;
            //   }
            //   trackPosition += (WINDOW_STEP / pvSubwindows) * alpha;
            // }
            // mixTrack->sample = trackPosition;
            /* END PV */

            /* resampling */
            for(int windowIndex=0;windowIndex < WINDOW_SIZE;windowIndex++){
              if(hasEnd && trackPosition > chunkEndPosition){
                //trackPosition = (trackPosition-chunkEndPosition) + nextChunkStart; //SAMPLE_ACCURATE_LOOP
                if(hasNext) playback = mixTrack->nextPlayback;
                if(windowIndex <= WINDOW_STEP) committedStep = true;
              }
              if(windowIndex == WINDOW_STEP) mixTrack->sample = trackPosition;

              float sampleValue = 0;
              if(
                trackPosition > 0 &&  
                trackPosition < length - 1 &&
                params->volume > 0 && 
                !playback->muted
              ){
                int sourceIndex = trackPosition;
                sampleValue = source->channels[channelIndex][sourceIndex];
                float nextValue = source->channels[channelIndex][sourceIndex + 1];
                sampleValue += (nextValue - sampleValue) * positionFrac;
                sampleValue *= state->window[windowIndex];
                applyFilter(sampleValue, playback, mixTrack, params, state, outBufferHead, channelIndex);
              }
              
              outBufferHead = (outBufferHead + 1) % state->buffer->size;
              trackPosition += alpha;
            }
            /* end resampling */
          }
        }
      }

      mixTrack->overlapIndex = (mixTrack->overlapIndex + 1) % OVERLAP_COUNT;
      if(committedStep){
        mixTrack->playback->chunkIndex = 
          (mixTrack->playback->chunkIndex + 1) % (mixTrack->playback->chunks.size() / 2);
        if(mixTrack->hasNext && (mixTrack->playback->chunkIndex == 0 || mixTrack->playback->nextAtChunk)){
          applyNextPlayback(mixTrack);
          mixTrack->playback->chunkIndex = 0;
        } 
        if(rec != NULL && rec->fromSourceId == mixTrackPair.first &&  !rec->started){
          rec->started = true;
          rec->fromSourceOffset = chunkEndPosition;
        }
      }
    }

    state->buffer->head = (state->buffer->head + WINDOW_STEP) % state->buffer->size;
    out = (float*)outputBuffer;
    copyToOut(state->buffer, out, outputFrameIndex, framesPerBuffer, rec);
  }

  /* update time and misc */
  state->playback->time = time + ((double)framesPerBuffer / state->playback->period);

  /* phase wrapped drung this callback */
  if(time-floor(time) > state->playback->time-floor(state->playback->time)){
    /* unpause any tracks as needed */
    for(auto mixTrackPair: state->mixTracks){
      mixTrack* mixTrack = mixTrackPair.second;
      if(
        mixTrack && 
        !mixTrack->removed &&
        mixTrack->hasNext && 
        (!mixTrack->playback->playing || mixTrack->playback->aperiodic) && 
        mixTrack->playback->unpause
      ) applyNextPlayback(mixTrack);
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