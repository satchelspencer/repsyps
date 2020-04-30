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
  if(playback->muted) return;
  sampleValue *= params->volume;
  sampleValue *= mixTrack->playback->volume;
  sampleValue *= state->playback->volume;
  if(mixTrack->hasFilter && mixTrack->filters[mixTrack->overlapIndex] != NULL){
    firfilt_rrrf_push(mixTrack->filters[mixTrack->overlapIndex], sampleValue);   
    firfilt_rrrf_execute(mixTrack->filters[mixTrack->overlapIndex], &sampleValue);
  }
  state->buffer->channels[channelIndex][outBufferHead] += sampleValue;
}

static std::complex<float> * x = new std::complex<float>[PV_WINDOW_SIZE];
static std::complex<float> * y = new std::complex<float>[PV_WINDOW_SIZE];
static std::complex<float> * z = new std::complex<float>[PV_WINDOW_SIZE];
static fftplan pf = fft_create_plan(PV_WINDOW_SIZE, (liquid_float_complex*)x, (liquid_float_complex*)y, LIQUID_FFT_FORWARD,  0);
static fftplan pr = fft_create_plan(PV_WINDOW_SIZE, (liquid_float_complex*)y, (liquid_float_complex*)z, LIQUID_FFT_BACKWARD,  0);

typedef struct{
  bool isPrev;
  float magnitude;
  int freq;
} heapItem;

bool lt(const heapItem& a,const heapItem& b){ 
  return a.magnitude < b.magnitude; 
} 

static float pi = M_PI;
static float tau = pi*2;
static bool PV_CLASSIC = false;

float unwrapPhase(const float & theta){
  return theta - (tau * round(theta / tau));
}

static std::vector<heapItem> mheap;

bool completed[PV_WINDOW_SIZE / 2];

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
              /* PV */
              int pvOverlap;
              if(alpha < 0.8) pvOverlap = 2;
              else pvOverlap = 6;
              
              pvState* pv = source->pvStates[channelIndex];
              int pvSubwindows = pvOverlap / OVERLAP_COUNT;
              float synthesisStep = WINDOW_STEP / pvSubwindows;
              float analysisStep = synthesisStep / alpha;
              float synthesisFreqStep = PV_FREQ_STEP * alpha;
              for(int pvWindow=0;pvWindow < pvSubwindows;pvWindow++){
                /* shift down the prev, current and next */
                float* swap = pv->lastPFFT;
                pv->lastPFFT = pv->currentPFFT;
                pv->currentPFFT = pv->nextPFFT;
                pv->nextPFFT = swap;


                outBufferHead = (int)(state->buffer->head + (pvWindow * synthesisStep)) % state->buffer->size;
                for(int pvWinIndex=0;pvWinIndex < PV_WINDOW_SIZE;pvWinIndex++){
                  int pos = trackPosition + pvWinIndex;
                  x[pvWinIndex] = state->fftWindow[pvWinIndex] * ((pos < length && pos >= 0) ? source->channels[channelIndex][pos] : 0);
                  // double samplePos = trackPosition + pvWinIndex;
                  // double samplePosFrac = samplePos-floor(samplePos);
                  // int pos = samplePos;
                  // if(pos < length - 1 && pos >= 0){
                  //   float sampleValue = source->channels[channelIndex][pos];
                  //   float nextSampleValue = source->channels[channelIndex][pos+1];
                  //   sampleValue += (nextSampleValue - sampleValue) * samplePosFrac;
                  //   x[pvWinIndex] = state->pvWindow[pvWinIndex] * sampleValue;
                  // }else x[pvWinIndex] = 0;
                }

                fft_execute(pf);

                /* convert to polar form PFFT is [mag, phase, mag, phase] */
                for(int pvWinIndex=0;pvWinIndex < PV_WINDOW_SIZE / 2;pvWinIndex++){
                  pv->nextPFFT[pvWinIndex * 2] = std::abs(y[pvWinIndex]);
                  pv->nextPFFT[pvWinIndex * 2 + 1] = std::arg(y[pvWinIndex]);
                }

                if(PV_CLASSIC){ //classical PV
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
                    }//else pv->currentPFFT[pvWinIndex * 2 + 1] = 0;
                  }
                }else{ //phase gradient heap integration
                  std::make_heap(mheap.begin(), mheap.end(), lt);
                  for(int pvWinIndex=0;pvWinIndex < PV_WINDOW_SIZE / 2;pvWinIndex++){
                    float mag = pv->lastPFFT[pvWinIndex * 2];
                    if(mag > PV_ABSTOL){
                        mheap.push_back({true, mag, pvWinIndex});
                        std::push_heap(mheap.begin(), mheap.end(), lt);
                    }
                    completed[pvWinIndex] = false;
                  }
                                
                  while(mheap.size() > 0){
                    std::pop_heap(mheap.begin(), mheap.end(), lt);
                    heapItem top = mheap.back();
                    mheap.pop_back();

                    if(
                      top.isPrev &&
                      pv->currentPFFT[top.freq * 2] > PV_ABSTOL &&
                      !completed[top.freq]
                    ){
                      float expectedPhaseAdv = state->omega[top.freq] * analysisStep;
                      float forwardPhaseTimeDelta = 
                        unwrapPhase(
                          pv->nextPFFT[top.freq * 2 + 1] - pv->currentPFFT[top.freq * 2 + 1] - expectedPhaseAdv
                        ) / analysisStep + state->omega[top.freq];
                      float centeredPhaseTimeDelta = (pv->lastPhaseTimeDelta[top.freq] + forwardPhaseTimeDelta) / 2;
                      float phaseAdvance = centeredPhaseTimeDelta * synthesisStep;
                      pv->currentPFFT[top.freq * 2 + 1] = pv->lastPFFT[top.freq * 2 + 1] + phaseAdvance;
                      pv->lastPhaseTimeDelta[top.freq] = forwardPhaseTimeDelta;
                      pv->phaseAdvance[top.freq] = phaseAdvance;

                      mheap.push_back({false, pv->currentPFFT[top.freq * 2], top.freq});
                      std::push_heap(mheap.begin(), mheap.end(), lt);
                      completed[top.freq] = true; 
                    }else if(!top.isPrev){
                      if(
                        top.freq < PV_MAX_FREQ &&
                        pv->currentPFFT[(top.freq + 1) * 2] > PV_ABSTOL &&
                        !completed[top.freq + 1]
                      ){
                        float originalPhase = pv->currentPFFT[top.freq * 2 + 1] - pv->phaseAdvance[top.freq];
                        float forwardPhaseFreqDelta = 
                          unwrapPhase(pv->currentPFFT[(top.freq + 1) * 2 + 1] - originalPhase) / PV_FREQ_STEP;
                        float backwardPhaseFreqDelta = 
                          top.freq > 0 ? 
                            unwrapPhase(originalPhase - pv->currentPFFT[(top.freq - 1) * 2 + 1]) / PV_FREQ_STEP :
                            forwardPhaseFreqDelta;
                        float centeredPhaseFreqDelta = (forwardPhaseFreqDelta + backwardPhaseFreqDelta) / 2;
                        float phaseAdvance = centeredPhaseFreqDelta * synthesisFreqStep;

                        //if(channelIndex == 0) std::cout << pv->currentPFFT[(top.freq + 1) * 2 + 1] << " -> " << unwrapPhase(pv->currentPFFT[top.freq * 2 + 1] + phaseAdvance) << std::endl;
                        pv->currentPFFT[(top.freq + 1) * 2 + 1] = pv->currentPFFT[top.freq * 2 + 1] + phaseAdvance;
                        pv->phaseAdvance[top.freq + 1] = phaseAdvance;
                        // pv->currentPFFT[(top.freq + 1) * 2 + 1] = pv->lastPFFT[(top.freq + 1) * 2 + 1] + pv->phaseAdvance[top.freq] + state->omega[top.freq + 1] * synthesisStep;
                        // pv->phaseAdvance[top.freq + 1] = pv->phaseAdvance[top.freq];

                        mheap.push_back({false, pv->currentPFFT[(top.freq + 1) * 2], top.freq + 1});
                        std::push_heap(mheap.begin(), mheap.end(), lt);
                        completed[top.freq + 1] = true;
                      }
                      if(
                        top.freq > 0 &&
                        pv->currentPFFT[(top.freq - 1) * 2] > PV_ABSTOL &&
                        !completed[top.freq - 1]
                      ){    
                        float originalPhase = pv->currentPFFT[top.freq * 2 + 1] - pv->phaseAdvance[top.freq];               
                        float backwardPhaseFreqDelta = 
                          unwrapPhase(originalPhase - pv->currentPFFT[(top.freq - 1) * 2 + 1]) / PV_FREQ_STEP ;
                        float forwardPhaseFreqDelta = 
                          top.freq < PV_MAX_FREQ ? 
                            unwrapPhase(pv->currentPFFT[(top.freq + 1) * 2 + 1] - originalPhase) / PV_FREQ_STEP :
                            backwardPhaseFreqDelta;
                        float centeredPhaseFreqDelta = (forwardPhaseFreqDelta + backwardPhaseFreqDelta) / 2;
                        float phaseAdvance = centeredPhaseFreqDelta * synthesisFreqStep;

                        pv->currentPFFT[(top.freq - 1) * 2 + 1] = pv->currentPFFT[top.freq * 2 + 1] - phaseAdvance;
                        pv->phaseAdvance[top.freq - 1] = phaseAdvance;

                        // pv->currentPFFT[(top.freq - 1) * 2 + 1] = pv->lastPFFT[(top.freq - 1) * 2 + 1] + pv->phaseAdvance[top.freq] + state->omega[top.freq - 1] * synthesisStep;
                        // pv->phaseAdvance[top.freq - 1] = pv->phaseAdvance[top.freq];

                        mheap.push_back({false, pv->currentPFFT[(top.freq - 1) * 2], top.freq - 1});
                        std::push_heap(mheap.begin(), mheap.end(), lt);
                        completed[top.freq - 1] = true;
                      }
                    }
                  }
                }
                
                /* convert back from polar */
                for(int pvWinIndex=0;pvWinIndex < PV_WINDOW_SIZE;pvWinIndex++){
                  if(pvWinIndex < PV_WINDOW_SIZE / 2)
                    y[pvWinIndex] = std::polar(pv->currentPFFT[pvWinIndex*2], pv->currentPFFT[pvWinIndex*2+1]);
                  else y[pvWinIndex] = 0;
                }
                  
                /* invert synthesis */
                fft_execute(pr);
                for(int pvWinIndex=0;pvWinIndex < PV_WINDOW_SIZE;pvWinIndex++){
                  float sampleValue = z[pvWinIndex].real() / (PV_WINDOW_SIZE / 4) / pvOverlap * state->pvWindow[pvWinIndex];
                  applyFilter(sampleValue, playback, mixTrack, params, state, outBufferHead, channelIndex);
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
                  sampleValue *= state->window[windowIndex];
                  applyFilter(sampleValue, playback, mixTrack, params, state, outBufferHead, channelIndex);
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