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
  
    newSource->length = len;
    newSource->channels.push_back(arrn);
    newSource->filterBuffers.push_back(new float[state.windowSize]);
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

mixTrackPlayback * initMixTrackPlayback(){
  mixTrackPlayback * playback = new mixTrackPlayback{};
  playback->chunkIndex = -1;
  playback->alpha = 1.;
  playback->playing = false;
  playback->muted = false;
  playback->filter = 0.5;
  playback->aperiodic = false;
  playback->nextAtChunk = false;
  return playback;
}

void setMixTrackPlayback(mixTrackPlayback * playback, Napi::Value value){
  Napi::Object update = value.As<Napi::Object>();
  Napi::Array props = update.GetPropertyNames();

  for(uint32_t i=0;i<props.Length();i++){
    Napi::Value propName = props.Get(i);
    Napi::Value value = update.Get(propName);
    std::string propNameStr = propName.As<Napi::String>().Utf8Value();

    if(propNameStr == "sourceTracksParams"){
      Napi::Object sourceTracksParams = value.As<Napi::Object>();
      Napi::Array sourceIds = sourceTracksParams.GetPropertyNames();

      /* addd new and update existing */
      for(uint32_t c=0;c<sourceIds.Length();c++){
        std::string sourceId = sourceIds.Get(c).As<Napi::String>().Utf8Value();
        Napi::Object source = sourceTracksParams.Get(sourceId).As<Napi::Object>();
        if(
          playback->sourceTracksParams.find(sourceId) == 
          playback->sourceTracksParams.end()
        ){ //source is new
          mixTrackSourceConfig * newMixTrackSource = new mixTrackSourceConfig{};
          newMixTrackSource->volume = source.Get("volume").As<Napi::Number>().FloatValue();
          playback->sourceTracksParams[sourceId] = newMixTrackSource;
        }else{
          playback->sourceTracksParams[sourceId]->volume = 
            source.Get("volume").As<Napi::Number>().FloatValue();
        }
      }
      /* find removed */
      for(auto sourcePair: playback->sourceTracksParams){
        if(!sourceTracksParams.Has(sourcePair.first)) playback->sourceTracksParams.erase(sourcePair.first);
      }
    }else if(propNameStr == "chunkIndex"){
      playback->chunkIndex = value.As<Napi::Number>().Int32Value();
    }else if(propNameStr == "chunks"){
      Napi::Array chunks = value.As<Napi::Array>();
      playback->chunks.clear();
      for(uint32_t i=0;i<chunks.Length();i++){
        int sample = chunks.Get(i).As<Napi::Number>().Int32Value();
        playback->chunks.push_back(sample);
      }
    }else if(propNameStr == "alpha"){
      playback->alpha = value.As<Napi::Number>().FloatValue();
    }else if(propNameStr == "playing"){
      playback->playing = value.As<Napi::Boolean>().Value();
    }else if(propNameStr == "muted"){
      playback->muted = value.As<Napi::Boolean>().Value();
    }else if(propNameStr == "filter"){
      playback->filter = value.As<Napi::Number>().FloatValue();
    }else if(propNameStr == "aperiodic"){
      playback->aperiodic = value.As<Napi::Boolean>().Value();
    }else if(propNameStr == "nextAtChunk"){
      playback->nextAtChunk = value.As<Napi::Boolean>().Value();
    }
  }
}

void setMixTrack(const Napi::CallbackInfo &info){
  std::string mixTrackId = info[0].As<Napi::String>().Utf8Value();
  Napi::Object update = info[1].As<Napi::Object>();
  Napi::Value playback = update.Get("playback");
  Napi::Value nextPlayback = update.Get("nextPlayback");

  if(state.mixTracks.find(mixTrackId) == state.mixTracks.end()){
    mixTrack * newMixTrack = new mixTrack{};
    newMixTrack->playback = initMixTrackPlayback();
    newMixTrack->nextPlayback = NULL;
    newMixTrack->hasNext = false;
    newMixTrack->hasFilter = false;
    newMixTrack->sample = 0;
    newMixTrack->filter = NULL;
    state.mixTracks[mixTrackId] = newMixTrack;
  }

  setMixTrackPlayback(state.mixTracks[mixTrackId]->playback, playback);

  if(playback.As<Napi::Object>().Has("filter")) 
    setMixTrackFilter(state.mixTracks[mixTrackId], state.mixTracks[mixTrackId]->playback->filter);

  if(!nextPlayback.IsUndefined()){
    if(nextPlayback.IsNull()){
      state.mixTracks[mixTrackId]->hasNext = false;
    }else {
      state.mixTracks[mixTrackId]->nextPlayback = initMixTrackPlayback();
      setMixTrackPlayback(state.mixTracks[mixTrackId]->nextPlayback, nextPlayback);
      state.mixTracks[mixTrackId]->hasNext = true;
    }
  }
}

Napi::Value removeMixTrack(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  std::string mixTrackId = info[0].As<Napi::String>().Utf8Value();
  
  if(state.mixTracks.find(mixTrackId) != state.mixTracks.end()){
    delete state.mixTracks[mixTrackId];
    state.mixTracks.erase(mixTrackId);
    return Napi::Boolean::New(env, true);
  }
  return Napi::Boolean::New(env, false);
}

Napi::Object getPlaybackTiming(Napi::Env env, mixTrackPlayback * playback){
  Napi::Object mixTrackPlayback = Napi::Object::New(env);
  mixTrackPlayback.Set("chunkIndex", playback->chunkIndex);
  mixTrackPlayback.Set("playing", playback->playing);
  mixTrackPlayback.Set("nextAtChunk", playback->nextAtChunk);
  mixTrackPlayback.Set("aperiodic", playback->aperiodic);
  mixTrackPlayback.Set("muted", playback->muted);
  mixTrackPlayback.Set("alpha", playback->alpha);
  mixTrackPlayback.Set("filter", playback->filter);

  Napi::Array chunks = Napi::Array::New(env);
  for(unsigned int i=0;i<playback->chunks.size();i++)
    chunks.Set(i, playback->chunks[i]);
  mixTrackPlayback.Set("chunks", chunks);

  Napi::Object sourceTracksParams = Napi::Object::New(env);
  for(auto sourcePair: playback->sourceTracksParams){
    Napi::Object source = Napi::Object::New(env);
    source.Set("volume", sourcePair.second->volume);
    sourceTracksParams.Set(sourcePair.first, source);
  }
  mixTrackPlayback.Set("sourceTracksParams", sourceTracksParams);
  return mixTrackPlayback;
}

Napi::Value getTiming(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  Napi::Object timings = Napi::Object::New(env);
  Napi::Object tracktimings = Napi::Object::New(env);
  for(auto mixTrackPair: state.mixTracks){
    Napi::Object mixTrackState = Napi::Object::New(env);
    mixTrackState.Set("sample", mixTrackPair.second->sample);

    mixTrackState.Set("playback", getPlaybackTiming(env, mixTrackPair.second->playback));
    if(mixTrackPair.second->hasNext)
      mixTrackState.Set("nextPlayback", getPlaybackTiming(env, mixTrackPair.second->nextPlayback));
    else mixTrackState.Set("nextPlayback", env.Null());

    tracktimings.Set(mixTrackPair.first, mixTrackState);
  }
  timings.Set("tracks", tracktimings);
  timings.Set("time", state.playback->time);
  return timings;
}

Napi::Value separateSource(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  Napi::Array inpchannels = info[0].As<Napi::Array>();
  int len;
  std::vector<float*> channels;

  Napi::Array outArray = Napi::Array::New(env);
  std::vector<float*> outChannels;
  int sepCount = 2;

  for(uint32_t i=0;i<inpchannels.Length();i++){
    Napi::TypedArray buff = inpchannels.Get(i).As<Napi::TypedArray>();
    float* arr = reinterpret_cast<float*>(buff.ArrayBuffer().Data());
    len = buff.ByteLength() / sizeof(float);
    
    channels.push_back(arr);

    for(int j=0;j<sepCount;j++){
      Napi::TypedArrayOf<float> oarr = Napi::TypedArrayOf<float>::New(env, len);
      outChannels.push_back(reinterpret_cast<float*>(oarr.ArrayBuffer().Data()));
      outArray.Set(i*2+j, oarr);
    }
  }

  separate(channels, outChannels, len);

  return outArray;
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
  exports.Set("setMixTrack", Napi::Function::New(env, setMixTrack));
  exports.Set("removeMixTrack", Napi::Function::New(env, removeMixTrack));
  exports.Set("getTiming", Napi::Function::New(env, getTiming));
  exports.Set("separateSource", Napi::Function::New(env, separateSource));
  exports.Set("getDebug", Napi::Function::New(env, getDebug));
}