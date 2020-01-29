#include "audio.h" 

static streamState state;
static PaStream * gstream;

Napi::Value init(const Napi::CallbackInfo &info){
  std::string rootPath = info[0].As<Napi::String>().Utf8Value();
  init_separator(rootPath);

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
    std::memcpy(arrn, arr, buff.ByteLength());

    // kfr::univector<float, 0> vect = kfr::make_univector(arrn, len);
    // kfr::biquad_params<float> bq[]    = { kfr::biquad_lowpass(0.02, 0.1) };
    // vect = kfr::biquad(bq, vect);

    newSource->length = len;
    newSource->channels.push_back(arrn);
  }

  //separate(newSource->channels, newSource->length);
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