#include "callback.h"
#include <iostream>

double getMixTrackPhase(
  playback* playback,
  const float & alpha
){
  double mixTrackPhase = playback->time * alpha;
  mixTrackPhase -= floor(mixTrackPhase); 
  return mixTrackPhase;
}

int getAvailable(ringbuffer* buffer){
  if(buffer->head >= buffer->tail) return buffer->head - buffer->tail;
  else return buffer->head + (buffer->size - buffer->tail);
}

void copyToOut(
  ringbuffer * buffer, 
  float * out, 
  unsigned int & outputFrameIndex,
  const unsigned long & framesPerBuffer,
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
    buffer->tail = (buffer->tail + 1)%buffer->size;
  }
}

void applyNextPlayback(std::string mixTrackId, streamState* state){
  mixTrack* mixTrack = state->mixTracks[mixTrackId];
  mixTrack->playback = mixTrack->nextPlayback;
  setMixTrackFilter(mixTrackId, state);
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

int normMod(const int & x, ringbuffer * buff){
  return (x + buff->size) % buff->size;
}

void applyFilter(
  float& sampleValue,
  mixTrackPlayback* playback,
  mixTrack* mixTrack,
  source* source,
  mixTrackSourceConfig* params,
  streamState *state,
  const int& outBufferHead,
  const int& trackBufferHead,
  const int& channelIndex,
  const float& window
){
  if(sampleValue < -1) sampleValue = -1;
  else if(sampleValue > 1) sampleValue = 1;
  if(playback->preview)
    state->previewBuffer->channels[channelIndex][outBufferHead] += sampleValue * window;
  if(playback->muted) sampleValue *= 0;
  sampleValue *= params->volume;
  sampleValue *= mixTrack->playback->volume;
  sampleValue *= state->playback->volume;
  int filterIndex = mixTrack->overlapIndex * OVERLAP_COUNT + channelIndex;
  if(mixTrack->hasFilter && source->filters[filterIndex] != NULL){
    firfilt_rrrf_push(source->filters[filterIndex], sampleValue);   
    firfilt_rrrf_execute(source->filters[filterIndex], &sampleValue);
  }
  float windowedValue = sampleValue * window;
  int delayedIndex = normMod(trackBufferHead - (playback->delay * state->playback->period), mixTrack->delayBuffer);
  float delayedValue = mixTrack->delayBuffer->channels[channelIndex][delayedIndex];
  mixTrack->delayBuffer->channels[channelIndex][normMod(trackBufferHead + WINDOW_SIZE*2, mixTrack->delayBuffer)] = 0;
  state->buffer->channels[channelIndex][outBufferHead] += windowedValue + delayedValue;
  mixTrack->delayBuffer->channels[channelIndex][trackBufferHead] += (delayedValue + windowedValue) * playback->delayGain;
}

static std::complex<float> * x = new std::complex<float>[PV_WINDOW_SIZE];
static std::complex<float> * y = new std::complex<float>[PV_WINDOW_SIZE];
static std::complex<float> * z = new std::complex<float>[PV_WINDOW_SIZE];
static fftplan pf = fft_create_plan(PV_WINDOW_SIZE, (liquid_float_complex*)x, (liquid_float_complex*)y, LIQUID_FFT_FORWARD,  0);
static fftplan pr = fft_create_plan(PV_WINDOW_SIZE, (liquid_float_complex*)y, (liquid_float_complex*)z, LIQUID_FFT_BACKWARD,  0);

static float pi = M_PI;
static float tau = pi*2;

float unwrapPhase(const float & theta){
  return theta - (tau * round(theta / tau));
}

static std::random_device rd;
static std::mt19937 gen(rd());
static std::uniform_real_distribution<> dis(0., 2.0*M_PI);

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
  unsigned int outputFrameIndex = 0;

  for(unsigned int frameIndex=0; frameIndex<framesPerBuffer*2; frameIndex++ ) *(out+frameIndex) = 0;
  if(!state->playback->playing) return paContinue;

  for(auto mixTrackPair: state->mixTracks){
    mixTrack* mixTrack = mixTrackPair.second;
    if(!mixTrack || mixTrack->removed || mixTrack->safe) continue;
    
    if(mixTrack->stretcher->available() < framesPerBuffer){ mixTrackPlayback* playback = mixTrack->playback;
      float trackAlpha = playback->alpha;
      double correctedTime = state->playback->time + ((double)mixTrack->stretcher->available() / state->playback->period);
      double mixTrackPhase = trackAlpha * correctedTime;
      mixTrackPhase -= floor(mixTrackPhase);
      int chunkIndex = playback->chunkIndex;
      int chunkCount = playback->chunks.size()/2;
      
      if(chunkCount == 0 || !playback->playing) continue;
      if(chunkIndex == -1){
        mixTrack->playback->chunkIndex = 0;
        chunkIndex = 0;
        mixTrack->sample = getSamplePosition(playback, 0);
      }

      int inputed = 0;
      int processed = 0;
      int available = mixTrack->stretcher->available();
      int i = 0;
      while(available < framesPerBuffer){
        double trueSamplePos = getSamplePosition(playback, mixTrackPhase);
        if(abs(trueSamplePos - mixTrack->sample) > 100) mixTrack->sample = trueSamplePos;
        double trackStartPosition = mixTrack->sample;//playback->aperiodic ? mixTrack->sample : getSamplePosition(playback, mixTrackPhase);
        //std::cout << mixTrack->sample - trackStartPosition << " " << available << std::endl;
        double chunkEndPosition = getSamplePosition(playback, 1);
        int chunkLength = playback->chunks[(chunkIndex * 2) + 1];
        bool hasEnd = chunkLength != 0;
        int nextChunkIndex = (chunkIndex + 1) % chunkCount;
        bool hasNext = mixTrack->hasNext && (chunkIndex == 0 || playback->nextAtChunk);
        double nextChunkStart = hasNext ?
          mixTrack->nextPlayback->chunks[0] : 
          playback->chunks[nextChunkIndex * 2];
        bool committedStep = false;
        float invAlpha = (hasEnd && !playback->aperiodic) ?
          chunkLength / (float)state->playback->period * trackAlpha :
          trackAlpha;
        float alpha = 1 / invAlpha;

        mixTrack->stretcher->setTimeRatio(alpha);
        mixTrack->stretcher->setPitchScale(1);

        int needed = mixTrack->stretcher->getSamplesRequired();
        inputed += needed;

        /* copy from all sources into stretchInput */
        int sourceIndex = 0;
        for(auto sourcePair: playback->sourceTracksParams){
          if(!( //skip destroyed sources
            state->sources.find(sourcePair.first) != state->sources.end() 
            && state->sources[sourcePair.first] != NULL
            && !state->sources[sourcePair.first]->safe
          )) continue;

          mixTrackSourceConfig* params = sourcePair.second;
          source* source = state->sources[sourcePair.first];
          int length = source->length;
          double trackPosition = trackStartPosition - params->offset;

          for(int inputIndex=0;inputIndex<needed;inputIndex++){
            for(int channelIndex=0;channelIndex < CHANNEL_COUNT;channelIndex++){
                int pos = trackPosition + processed + inputIndex;
              float sampleValue = (pos < length && pos >= 0) ? source->channels[channelIndex][pos] : 0;
              sampleValue *= params->volume; //mix it before input
              mixTrack->stretchInput[channelIndex][inputIndex] = sourceIndex == 0
                ? sampleValue
                : mixTrack->stretchInput[channelIndex][inputIndex] + sampleValue;
            }
          }
          sourceIndex++;
        }

        /* apply time updates to track */
        mixTrack->sample = trackStartPosition + needed;
        if(hasEnd && trueSamplePos + needed > chunkEndPosition){ //we crossed a chunk boundary
          mixTrack->playback->chunkIndex = 
            (mixTrack->playback->chunkIndex + 1) % (mixTrack->playback->chunks.size() / 2);
          
          /* if end of playback and no loop and no next. stoppit */
          if(!mixTrack->hasNext && mixTrack->playback->chunkIndex == 0 && !mixTrack->playback->loop){
            mixTrack->playback->playing = false;
            mixTrack->playback->chunkIndex = -1;
          }else{
            mixTrack->sample = nextChunkStart + (mixTrack->sample - chunkEndPosition);
            
            if(mixTrack->hasNext && (mixTrack->playback->chunkIndex == 0 || mixTrack->playback->nextAtChunk)){
              applyNextPlayback(mixTrackPair.first, state);
              mixTrack->playback->chunkIndex = 0;
            } 
            
            if(rec != NULL && rec->fromSourceId == mixTrackPair.first && !rec->started){
              rec->started = true;
              rec->fromSourceOffset = chunkEndPosition;
            }
          }
        }

        for(int inputIndex=0;inputIndex<needed;inputIndex++){
          for(int channelIndex=0;channelIndex < CHANNEL_COUNT;channelIndex++){
            float sampleValue = mixTrack->stretchInput[channelIndex][inputIndex];
            if(sampleValue < -1) sampleValue = -1;
            else if(sampleValue > 1) sampleValue = 1;
            if(playback->muted) sampleValue *= 0;
            sampleValue *= mixTrack->playback->volume;
            sampleValue *= state->playback->volume;
            // if(mixTrack->hasFilter && mixTrack->filter != NULL){
            //   firfilt_rrrf_push(mixTrack->filter, sampleValue);   
            //   firfilt_rrrf_execute(mixTrack->filter, &sampleValue);
            // }
            // int delayedIndex = normMod(
            //   mixTrack->delayBuffer->head - (playback->delay * state->playback->period),
            //   mixTrack->delayBuffer
            // );
            // float delayedValue = mixTrack->delayBuffer->channels[channelIndex][delayedIndex];
            // sampleValue += delayedValue;
            // mixTrack->delayBuffer->channels[channelIndex][mixTrack->delayBuffer->head + inputIndex] = sampleValue * playback->delayGain;
            mixTrack->stretchInput[channelIndex][inputIndex] = sampleValue;
          }
        }
        mixTrack->delayBuffer->head = (mixTrack->delayBuffer->head + needed) % mixTrack->delayBuffer->size;

        mixTrack->stretcher->process(mixTrack->stretchInput, needed, false);
        int newAvailable = mixTrack->stretcher->available();
        processed += newAvailable - available;
        available = newAvailable;
        if(available == 0) break;
      }
    }
    //std::cout << "av " << mixTrack->stretcher->available() << " - " << framesPerBuffer << std::endl;
    mixTrack->stretcher->retrieve(mixTrack->stretchOutput, framesPerBuffer);
    float* output = (float*)outputBuffer;
    for(int frameIndex=0;frameIndex<framesPerBuffer;frameIndex++){
      for(int channelIndex=0;channelIndex < CHANNEL_COUNT;channelIndex++)
        *output++ += mixTrack->stretchOutput[channelIndex][frameIndex];
    }
  }

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
  unsigned int outputFrameIndex = 0;

  for(unsigned int frameIndex=0; frameIndex<framesPerBuffer*2; frameIndex++ ) *(out+frameIndex) = 0;
  if(!state->previewing) return paContinue;
  
  copyToOut(state->previewBuffer, out, outputFrameIndex, framesPerBuffer, NULL);

  return paContinue;
}