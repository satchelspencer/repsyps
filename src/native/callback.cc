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
  double phase
){
  return playback->chunks[playback->chunkIndex*2] +
  ( playback->chunks[playback->chunkIndex*2+1] * phase );
}

void applyFilter(
  float& sampleValue,
  mixTrackPlayback* playback,
  mixTrack* mixTrack,
  source* source,
  mixTrackSourceConfig* params,
  streamState *state,
  int outBufferHead,
  int channelIndex,
  float window
){
  if(playback->muted) return;
  sampleValue *= params->volume;
  sampleValue *= mixTrack->playback->volume;
  sampleValue *= state->playback->volume;
  int filterIndex = mixTrack->overlapIndex * OVERLAP_COUNT + channelIndex;
  if(mixTrack->hasFilter && source->filters[filterIndex] != NULL){
    firfilt_rrrf_push(source->filters[filterIndex], sampleValue);   
    firfilt_rrrf_execute(source->filters[filterIndex], &sampleValue);
  }
  state->buffer->channels[channelIndex][outBufferHead] += sampleValue * window;
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
      float invAlpha = (hasEnd && !playback->aperiodic) ?
        chunkLength / (float)state->playback->period * trackAlpha :
        trackAlpha;
      float alpha = 1 / invAlpha;

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

            if(playback->preservePitch){
              /* Phase Vocorder */
              int pvOverlap;
              if(alpha < 0.8) pvOverlap = 2;
              else pvOverlap = 5 + (alpha - 1) * 2;
              
              pvState* pv = source->pvStates[channelIndex];
              int pvSubwindows = pvOverlap / OVERLAP_COUNT;
              float synthesisStep = WINDOW_STEP / pvSubwindows;
              float analysisStep = synthesisStep / alpha;

              for(int pvWindow=0;pvWindow < pvSubwindows;pvWindow++){
                /* shift down the prev, current and next */
                float* swap = pv->lastPFFT;
                pv->lastPFFT = pv->currentPFFT;
                pv->currentPFFT = pv->nextPFFT;
                pv->nextPFFT = swap;


                outBufferHead = (int)(state->buffer->head + (pvWindow * synthesisStep)) % state->buffer->size;
                for(int pvWinIndex=0;pvWinIndex < PV_WINDOW_SIZE;pvWinIndex++){
                  int pos = trackPosition + pvWinIndex;
                  x[pvWinIndex] = 
                    state->fftWindow[pvWinIndex] *
                    ((pos < length && pos >= 0) ? source->channels[channelIndex][pos] : 0);
                }

                fft_execute(pf);

                /* convert to polar form PFFT is [mag, phase, mag, phase] */
                for(int pvWinIndex=0;pvWinIndex < PV_WINDOW_SIZE / 2;pvWinIndex++){
                  pv->nextPFFT[pvWinIndex * 2] = std::abs(y[pvWinIndex]);
                  pv->nextPFFT[pvWinIndex * 2 + 1] = std::arg(y[pvWinIndex]);
                }

                /* classic PV */
                for(int pvWinIndex=0;pvWinIndex < PV_WINDOW_SIZE / 2;pvWinIndex++){
                  float mag = pv->lastPFFT[pvWinIndex * 2];
                  if(mag > PV_ABSTOL){
                    float expectedPhaseAdv = state->omega[pvWinIndex] * analysisStep;
                    float forwardPhaseTimeDelta = 
                      unwrapPhase(
                        pv->nextPFFT[pvWinIndex * 2 + 1] - pv->currentPFFT[pvWinIndex * 2 + 1] - expectedPhaseAdv
                      ) / analysisStep + state->omega[pvWinIndex];
                    float centeredPhaseTimeDelta = (pv->lastPhaseTimeDelta[pvWinIndex] + forwardPhaseTimeDelta) / 2;
                    float phaseAdvance = centeredPhaseTimeDelta * synthesisStep;
                    pv->currentPFFT[pvWinIndex * 2 + 1] = pv->lastPFFT[pvWinIndex * 2 + 1] + phaseAdvance;
                    pv->lastPhaseTimeDelta[pvWinIndex] = forwardPhaseTimeDelta;
                  }else pv->currentPFFT[pvWinIndex * 2 + 1] = dis(gen);
                }
                
                /* convert back from polar */
                for(int pvWinIndex=0;pvWinIndex < PV_WINDOW_SIZE;pvWinIndex++){
                  if(pvWinIndex < PV_WINDOW_SIZE / 2)
                    y[pvWinIndex] = std::polar(pv->currentPFFT[pvWinIndex*2], pv->currentPFFT[pvWinIndex*2+1]);
                  else y[pvWinIndex] = 0;
                }
                  
                /* invert fft */
                fft_execute(pr);
                for(int pvWinIndex=0;pvWinIndex < PV_WINDOW_SIZE;pvWinIndex++){
                  float sampleValue = z[pvWinIndex].real() / (PV_WINDOW_SIZE / 4) / pvOverlap;
                  applyFilter(sampleValue, playback, mixTrack, source, params, state, outBufferHead, channelIndex, state->pvWindow[pvWinIndex]);
                  outBufferHead = (outBufferHead + 1) % state->buffer->size;
                }
                trackPosition += analysisStep;
              }
              if(trackPosition > chunkEndPosition && hasEnd) committedStep = true;
              mixTrack->sample = trackPosition + params->offset;
              /* END PV */
            }else{
              /* resampling */
              for(int windowIndex=0;windowIndex < WINDOW_SIZE;windowIndex++){
                double positionFrac = trackPosition-floor(trackPosition);
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
                  applyFilter(sampleValue, playback, mixTrack, source, params, state, outBufferHead, channelIndex, state->window[windowIndex]);
                }
                
                outBufferHead = (outBufferHead + 1) % state->buffer->size;
                trackPosition += invAlpha;
              }
              /* end resampling */
            }
          }
        }
      }

      mixTrack->overlapIndex = (mixTrack->overlapIndex + 1) % OVERLAP_COUNT;
      if(committedStep){
        mixTrack->playback->chunkIndex = 
          (mixTrack->playback->chunkIndex + 1) % (mixTrack->playback->chunks.size() / 2);
        if(mixTrack->playback->aperiodic) mixTrack->sample = nextChunkStart + (mixTrack->sample - chunkEndPosition);
        if(mixTrack->hasNext && (mixTrack->playback->chunkIndex == 0 || mixTrack->playback->nextAtChunk)){
          applyNextPlayback(mixTrackPair.first, state);
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