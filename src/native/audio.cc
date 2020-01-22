#include "audio.h"

static int paCallbackMethod(
  const void *inputBuffer, 
  void *outputBuffer,
  unsigned long framesPerBuffer,
  const PaStreamCallbackTimeInfo* timeInfo,
  PaStreamCallbackFlags statusFlags,
  void *userData
){
  streamState *state = (streamState*)userData;
  float *out = (float*)outputBuffer;
  unsigned long i;

  double trackPhase;
  double phaseStep = 1/(double)state->playback->period;
  
  for( i=0; i<framesPerBuffer*2; i++ ) *out++ = 0;

  if(!state->playback->playing) return paContinue;

  int sampleIndex;
  double sample;
  double sampleFrac;
  float s;
  float sn;
  source* trackSource;
  track* track;
  int channelCount;
  int channelIndex;
  int chunkCount;
  unsigned int outputIndex = 0;
  int bufferChannelCount = state->buffer->channels.size();
  int bufferHead; //this is separate since we reset it for each track
  int tempTrackChunkIndex;
  int tempTrackSample;

  /* empty the ringbuffer into the output */
  out = (float*)outputBuffer;
  while(state->buffer->head != state->buffer->tail && outputIndex < framesPerBuffer){
    for(channelIndex=0;channelIndex<bufferChannelCount;channelIndex++){
      *out++ += state->buffer->channels[channelIndex][state->buffer->tail];
      state->buffer->channels[channelIndex][state->buffer->tail] = 0; //reset it to 0
    }
    outputIndex++;
    state->buffer->tail = (state->buffer->tail+1)%state->buffer->size;
  }

  /* keep computing new windows until we fill the output buffer */
  while(outputIndex < framesPerBuffer){
    for(auto trackPair: state->tracks){
      track = trackPair.second;
      bufferHead = state->buffer->head;

      trackPhase = state->playback->time*track->alpha;
      trackPhase -= floor(trackPhase);

      trackSource = state->sources[track->sourceId];
      channelCount = trackSource->channels.size();
      chunkCount = track->chunks.size()/2;

      if(chunkCount == 0 || !track->playing) continue;
      
      tempTrackChunkIndex = track->chunkIndex;
      tempTrackSample = track->sample;

      /* add this computed track into the buffer */
      for( i=0; i<state->windowSize; i++ ){
        /* figure out which sample we're gonna fetch */
        if(tempTrackChunkIndex == -1 && trackPhase >= 0){
          tempTrackChunkIndex = 0;
          tempTrackSample = track->chunks[tempTrackChunkIndex*2]; //reset the sample to the start
        } //on first
        if(tempTrackChunkIndex == -1) break; //before we should be playing

        if(track->aperiodic){
          sample = tempTrackSample + track->alpha;
          if(track->chunks[tempTrackChunkIndex*2+1] > 0){ //chunk has end
            if(sample > track->chunks[tempTrackChunkIndex*2]+track->chunks[tempTrackChunkIndex*2+1]){
              tempTrackChunkIndex = (tempTrackChunkIndex + 1) % chunkCount;
              sample = track->chunks[tempTrackChunkIndex*2];
            }
          }else if(sample >= trackSource->length) sample = 0; //chunk has no end, wrap on playback
        }else{
          sample = track->chunks[tempTrackChunkIndex*2] + ( track->chunks[tempTrackChunkIndex*2+1] * trackPhase );
          if( sample < tempTrackSample) {  /* check if we looped around */
            tempTrackChunkIndex = (tempTrackChunkIndex + 1) % chunkCount; //increment the chunk
            sample = track->chunks[tempTrackChunkIndex*2] + ( track->chunks[tempTrackChunkIndex*2+1] * trackPhase );
          }
        }

        tempTrackSample = sample;
        sampleFrac = sample-floor(sample);
        sampleIndex = sample;

        /* at the step point commit the mutated index and sample */
        if(i == state->windowSize/2 - 1){
          track->chunkIndex = tempTrackChunkIndex;
          track->sample = tempTrackSample;
        }
        state->playback->out = track->chunkIndex;


        /* add the sample to the buffer */
        for(channelIndex=0;channelIndex<channelCount;channelIndex++){
          s = trackSource->channels[channelIndex][sampleIndex];
          sn = trackSource->channels[channelIndex][sampleIndex+1];
          s += (sn-s)*sampleFrac; //linear interp
          
          s *= state->playback->volume;
          s *= track->volume;
          s *= state->window[i]; //multiply by the window
          state->buffer->channels[channelIndex][bufferHead] += s;
        }       
        bufferHead = (bufferHead+1)%state->buffer->size;
        trackPhase += phaseStep*track->alpha;       
      }
    }
    //head only moves forward by half the window size
    state->buffer->head = (state->buffer->head + (state->windowSize/2)) % state->buffer->size;

    /* empty the ringbuffer into the output... again */
    out = (float*)outputBuffer;
    while(outputIndex < framesPerBuffer){
      for(channelIndex=0;channelIndex<bufferChannelCount;channelIndex++){
        *out++ += state->buffer->channels[channelIndex][state->buffer->tail];
        state->buffer->channels[channelIndex][state->buffer->tail] = 0;
      }
      outputIndex++;
      state->buffer->tail = (state->buffer->tail+1)%state->buffer->size;
    }
  }
  
  state->playback->time += (double)framesPerBuffer/state->playback->period;
  return paContinue;
}


Napi::Value init(const Napi::CallbackInfo &info){
  playback * newPlayback = new playback{};
  newPlayback->time = 0.;
  newPlayback->playing = false;
  newPlayback->period = 0;
  newPlayback->volume = 1;
  state.playback = newPlayback;

  int windowSize = 2048;
  float* window = new float[windowSize];
  state.window = window;
  state.windowSize = windowSize;
  for(int i=0;i<windowSize;i++)
    window[i] = (cos(M_PI*2*(float(i)/(windowSize-1) + 0.5)) + 1)/2;
  

  ringbuffer * newBuffer = new ringbuffer{};
  newBuffer->size = windowSize*2;
  newBuffer->head = 0;
  newBuffer->tail = 0;
  for(int i=0;i<2;i++){
    float* buff = new float[windowSize*2];
    for(int j=0;j<windowSize*2;j++) buff[j] = 0;
    newBuffer->channels.push_back(buff);
  }
  state.buffer = newBuffer;

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 666);
}


Napi::Value start(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();

  Pa_Initialize();

  PaStreamParameters outputParameters;
  outputParameters.device = Pa_GetDefaultOutputDevice();
  outputParameters.channelCount = 2; /* stereo output */
  outputParameters.sampleFormat = paFloat32; /* 32 bit floating point output */
  outputParameters.suggestedLatency = Pa_GetDeviceInfo( outputParameters.device )->defaultHighOutputLatency;
  outputParameters.hostApiSpecificStreamInfo = NULL;

  Pa_OpenStream(
    &gstream,
    NULL, /* no input */
    &outputParameters,
    44100,
    64,
    paNoFlag,     
    &paCallbackMethod,
    &state      
  );

  Pa_StartStream(gstream);

  return Napi::Number::New(env, 1);
}

void stop(const Napi::CallbackInfo &info){
  Pa_StopStream(gstream);
}

void updatePlayback(const Napi::CallbackInfo &info){
  Napi::Object update = info[0].As<Napi::Object>();
  Napi::Array props = update.GetPropertyNames();

  for(uint32_t i=0;i<props.Length();i++){
    Napi::Value propName = props.Get(i);
    Napi::Value value = update.Get(propName);
    std::string propNameStr = propName.As<Napi::String>().Utf8Value();

    if(propNameStr == "volume"){
      state.playback->volume = value.As<Napi::Number>().FloatValue();
    }else if(propNameStr == "time"){
      state.playback->time = value.As<Napi::Number>().DoubleValue();
    }else if(propNameStr == "playing"){
      state.playback->playing = value.As<Napi::Boolean>().Value();
    }else if(propNameStr == "period"){
      state.playback->period = value.As<Napi::Number>().Int32Value();
    }
  }
}

void addSource(const Napi::CallbackInfo &info){
  std::string sourceId = info[0].As<Napi::String>().Utf8Value();
  Napi::Array channels = info[1].As<Napi::Array>();
  
  source * newSource = new source{};

  for(uint32_t i=0;i<channels.Length();i++){
    Napi::TypedArray buff = channels.Get(i).As<Napi::TypedArray>();
    float* arr = reinterpret_cast<float*>(buff.ArrayBuffer().Data());
    int len = buff.ByteLength() / sizeof(float);
    float* arrn = new float[len];
    for(int j = 0;j<len;j++) arrn[j] = arr[j];

    // kfr::univector<float, 0> vect = kfr::make_univector(arrn, len);
    // kfr::biquad_params<float> bq[]    = { kfr::biquad_lowpass(0.02, 0.1) };
    // vect = kfr::biquad(bq, vect);

    newSource->length = len;
    newSource->channels.push_back(arrn);
  }
  state.sources[sourceId] = newSource;
}

Napi::Value removeSource(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  std::string sourceId = info[0].As<Napi::String>().Utf8Value();
  
  if(state.sources.find(sourceId) != state.sources.end()){
    source * currentSource = state.sources[sourceId];
    for(auto channel: currentSource->channels){
      delete[] channel;
    }
    state.sources.erase(sourceId);
    delete currentSource;
    return Napi::Boolean::New(env, true);
  }
  return Napi::Boolean::New(env, false);
}

void setTrack(const Napi::CallbackInfo &info){
  std::string trackId = info[0].As<Napi::String>().Utf8Value();
  Napi::Object update = info[1].As<Napi::Object>();
  Napi::Array props = update.GetPropertyNames();

  if(state.tracks.find(trackId) == state.tracks.end()){
    track * newTrack = new track{};
    newTrack->sourceId = "";
    newTrack->volume = 1.;
    newTrack->chunkIndex = -1;
    newTrack->alpha = 1.;
    newTrack->playing = false;
    newTrack->aperiodic = false;
    newTrack->sample = 0;
    state.tracks[trackId] = newTrack;
  }

  for(uint32_t i=0;i<props.Length();i++){
    Napi::Value propName = props.Get(i);
    Napi::Value value = update.Get(propName);
    std::string propNameStr = propName.As<Napi::String>().Utf8Value();

    if(propNameStr == "sourceId"){
      state.tracks[trackId]->sourceId = value.As<Napi::String>().Utf8Value();
    }else if(propNameStr == "volume"){
      state.tracks[trackId]->volume = value.As<Napi::Number>().FloatValue();
    }else if(propNameStr == "chunkIndex"){
      state.tracks[trackId]->chunkIndex = value.As<Napi::Number>().Int32Value();
    }else if(propNameStr == "chunks"){
      Napi::Array chunks = value.As<Napi::Array>();
      state.tracks[trackId]->chunks.clear();
      for(uint32_t i=0;i<chunks.Length();i++){
        int sample = chunks.Get(i).As<Napi::Number>().Int32Value();
        state.tracks[trackId]->chunks.push_back(sample);
      }
    }else if(propNameStr == "alpha"){
      state.tracks[trackId]->alpha = value.As<Napi::Number>().FloatValue();
    }else if(propNameStr == "playing"){
      state.tracks[trackId]->playing = value.As<Napi::Boolean>().Value();
    }else if(propNameStr == "aperiodic"){
      state.tracks[trackId]->aperiodic = value.As<Napi::Boolean>().Value();
    }
  }
}

Napi::Value removeTrack(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  std::string trackId = info[0].As<Napi::String>().Utf8Value();
  
  if(state.tracks.find(trackId) != state.tracks.end()){
    delete state.tracks[trackId];
    state.tracks.erase(trackId);
    return Napi::Boolean::New(env, true);
  }
  return Napi::Boolean::New(env, false);
}

Napi::Value getTiming(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  Napi::Object timings = Napi::Object::New(env);
   timings.Set("playback", state.playback->time);
  for(auto trackPair: state.tracks){
    Napi::Object trackState = Napi::Object::New(env);
    trackState.Set("sample", trackPair.second->sample);
    trackState.Set("chunkIndex", trackPair.second->chunkIndex);
    timings.Set(trackPair.first, trackState);
  }
  return timings;
}

Napi::Value getDebug(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  return Napi::Number::New(env, state.playback->out);
}


void InitAudio(Napi::Env env, Napi::Object exports){  
  exports.Set("init", Napi::Function::New(env, init));
  exports.Set("start", Napi::Function::New(env, start));
  exports.Set("stop", Napi::Function::New(env, stop));
  exports.Set("updatePlayback", Napi::Function::New(env, updatePlayback));
  exports.Set("addSource", Napi::Function::New(env, addSource));
  exports.Set("removeSource", Napi::Function::New(env, removeSource));
  exports.Set("setTrack", Napi::Function::New(env, setTrack));
  exports.Set("removeTrack", Napi::Function::New(env, removeTrack));
  exports.Set("getTiming", Napi::Function::New(env, getTiming));
  exports.Set("getDebug", Napi::Function::New(env, getDebug));
}