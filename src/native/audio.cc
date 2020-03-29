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
  if(DEBUG) std::cout << "start" << std::endl;
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
  if(DEBUG) std::cout << "playback" << std::endl;
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
  if(DEBUG) std::cout << "add src" << std::endl;
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
    newSource->removed = false;
  }

  state.sources[sourceId] = newSource;
}

Napi::Value removeSource(const Napi::CallbackInfo &info){
  if(DEBUG) std::cout << "rm src" << std::endl;
  Napi::Env env = info.Env();
  std::string sourceId = info[0].As<Napi::String>().Utf8Value();
  
  if(state.sources.find(sourceId) != state.sources.end() && state.sources[sourceId] != NULL){
    state.sources[sourceId]->removed = true;   
    return Napi::Boolean::New(env, true);
  }
  return Napi::Boolean::New(env, false);
}

mixTrackPlayback * initMixTrackPlayback(){
  mixTrackPlayback * playback = new mixTrackPlayback{};
  playback->chunkIndex = -1;
  playback->alpha = 1.;
  playback->volume = 1.;
  playback->playing = false;
  playback->loop = true;
  playback->muted = false;
  playback->filter = 0.5;
  playback->aperiodic = false;
  playback->nextAtChunk = false;
  return playback;
}

void setMixTrackPlayback(mixTrackPlayback * playback, Napi::Value value){
  if(DEBUG) std::cout << "track playback" << std::endl;
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
          newMixTrackSource->offset = source.Get("offset").As<Napi::Number>().Int32Value();
          newMixTrackSource->destroy = false;
          playback->sourceTracksParams[sourceId] = newMixTrackSource;
        }else{
          playback->sourceTracksParams[sourceId]->volume = 
            source.Get("volume").As<Napi::Number>().FloatValue();
          playback->sourceTracksParams[sourceId]->offset = 
            source.Get("offset").As<Napi::Number>().Int32Value();
        }
      }
      /* find removed */
      for(auto sourcePair: playback->sourceTracksParams){
        if(!sourceTracksParams.Has(sourcePair.first) || state.sources[sourcePair.first] == NULL){
          sourcePair.second->volume = 0;
          sourcePair.second->destroy = true;
        }
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
    }else if(propNameStr == "volume"){
      playback->volume = value.As<Napi::Number>().FloatValue();
    }else if(propNameStr == "playing"){
      playback->playing = value.As<Napi::Boolean>().Value();
    }else if(propNameStr == "loop"){
      playback->loop = value.As<Napi::Boolean>().Value();
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
  if(DEBUG) std::cout << "set track " << mixTrackId << std::endl;

  if(state.mixTracks.find(mixTrackId) == state.mixTracks.end() || state.mixTracks[mixTrackId] == NULL){
    mixTrack * newMixTrack = new mixTrack{};
    newMixTrack->playback = initMixTrackPlayback();
    newMixTrack->nextPlayback = NULL;
    newMixTrack->hasNext = false;
    newMixTrack->hasFilter = false;
    newMixTrack->sample = 0;
    newMixTrack->filter = NULL;
    newMixTrack->removed = false;
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
  if(DEBUG) std::cout << "rm track" << std::endl;
  Napi::Env env = info.Env();
  std::string mixTrackId = info[0].As<Napi::String>().Utf8Value();

  if(state.mixTracks[mixTrackId] == NULL) return Napi::Boolean::New(env, false);
  
  if(state.mixTracks.find(mixTrackId) != state.mixTracks.end()  && state.mixTracks[mixTrackId] != NULL){
    state.mixTracks[mixTrackId]->removed = true;
    return Napi::Boolean::New(env, true);
  }
  return Napi::Boolean::New(env, false);
}

Napi::Object getPlaybackTiming(Napi::Env env, mixTrackPlayback * playback){
  Napi::Object mixTrackPlayback = Napi::Object::New(env);
  mixTrackPlayback.Set("chunkIndex", playback->chunkIndex);
  mixTrackPlayback.Set("playing", playback->playing);
  return mixTrackPlayback;
}

Napi::Value getTiming(const Napi::CallbackInfo &info){
  //std::cout << "get timing" << std::endl;
  Napi::Env env = info.Env();
  Napi::Object timings = Napi::Object::New(env);
  Napi::Object tracktimings = Napi::Object::New(env);
  for(auto mixTrackPair: state.mixTracks){
    if(mixTrackPair.second == NULL) continue;
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

void separateSource(const Napi::CallbackInfo &info){
  std::string sourceId = info[0].As<Napi::String>().Utf8Value();
  int sourceLen = state.sources[sourceId]->length;

  std::vector<float*> outChannels;
  int sepCount = 2;
  unsigned int channelCount = state.sources[sourceId]->channels.size();

  for(uint32_t i=0;i<channelCount;i++){
    for(int j=0;j<sepCount;j++){
      float* outBuff = new float[sourceLen];
      outChannels.push_back(outBuff);
    }
  }

  separate(state.sources[sourceId]->channels, outChannels, sourceLen);

  for(int j=0;j<sepCount;j++){
    std::string sourceTrackId = sourceId + (j > 0?"_instru":"_vocal");
    source * newSource = new source{};
    newSource->length = sourceLen;
    newSource->removed = false;
    newSource->data = NULL;
    for(unsigned int i=0;i<channelCount;i++){
      newSource->channels.push_back(outChannels[j*sepCount + i]);
      newSource->filterBuffers.push_back(new float[state.windowSize]); //alloc a buffer
    }
    state.sources[sourceTrackId] = newSource;
  }
}

void getWaveform(const Napi::CallbackInfo &info){
  if(DEBUG) std::cout << "waveform" << std::endl;
  std::string sourceId = info[0].As<Napi::String>().Utf8Value();
  int start = info[1].As<Napi::Number>().Int32Value();
  float scale = info[2].As<Napi::Number>().FloatValue();
  Napi::TypedArray buff = info[3].As<Napi::TypedArray>();

  if(state.sources.find(sourceId) != state.sources.end() && state.sources[sourceId] != NULL){
    float* dest = reinterpret_cast<float*>(buff.ArrayBuffer().Data());
    int destLen = buff.ByteLength() / sizeof(float); 
    float* source = state.sources[sourceId]->channels[0];
    int sourceLen = state.sources[sourceId]->length;

    minMaxWaveform(scale, start, source, sourceLen, dest, destLen);
  }
}

Napi::Value getImpulses(const Napi::CallbackInfo &info){
  if(DEBUG) std::cout << "impulses" << std::endl;
  Napi::Env env = info.Env();
  std::string sourceId = info[0].As<Napi::String>().Utf8Value();
  Napi::Array result = Napi::Array::New(env);

  if(state.sources.find(sourceId) != state.sources.end() && state.sources[sourceId] != NULL){
    float* source = state.sources[sourceId]->channels[0];
    int sourceLen = state.sources[sourceId]->length;

    std::vector<int> beats = impulseDetect(source, sourceLen);

    for(uint32_t beatIndex = 0;beatIndex<beats.size();beatIndex++)
      result.Set(beatIndex, beats[beatIndex]);
  }
  
  return result;
}

class LoadWorker : public Napi::AsyncWorker {
  public:
    LoadWorker(
      Napi::Env &env,
      std::string path,
      std::string sourceId
    ): Napi::AsyncWorker(env),
       deferred(Napi::Promise::Deferred::New(env)),
       path(path),
       sourceId(sourceId){}

    ~LoadWorker() {}
    void Execute() { 
      loadSrc(path, sourceId, loadResponses);
    }
    void OnOK() {
      Napi::Env env = Env();
      Napi::HandleScope scope(env);

      Napi::Array loadedSources = Napi::Array::New(env);
      loadResponse * res;
      for(unsigned int i=0;i<loadResponses.size();i++){
        res = loadResponses[i];
        source * newSource = new source{};
        newSource->length = res->length;
        newSource->removed = false;
        newSource->data = res->data;
        for(unsigned int i=0;i<res->channels.size();i++){
          newSource->channels.push_back(res->channels[i]);
          newSource->filterBuffers.push_back(new float[state.windowSize]); //alloc a buffer
        }
        state.sources[res->sourceId] = newSource;
        loadedSources.Set(i, res->sourceId);
      }

      deferred.Resolve(loadedSources);
    }
    void OnError(Napi::Error const &error) {
      deferred.Reject(error.Value());
    }
    Napi::Promise GetPromise() {
      return deferred.Promise();
    }
  private:
    Napi::Promise::Deferred deferred;
    std::string path;
    std::string sourceId;
    std::vector<loadResponse *> loadResponses; 
};

Napi::Value loadSource(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  std::string path = info[0].As<Napi::String>().Utf8Value();
  std::string sourceId = info[1].As<Napi::String>().Utf8Value();
  if(DEBUG) std::cout << "load " << sourceId << std::endl;

  LoadWorker* loadWorker = new LoadWorker(env, path, sourceId);
  auto promise = loadWorker->GetPromise();
  loadWorker->Queue();
  return promise;
}

Napi::Value exportSource(const Napi::CallbackInfo &info){
  if(DEBUG) std::cout << "export" << std::endl;
  Napi::Env env = info.Env();
  std::string path = info[0].As<Napi::String>().Utf8Value();
  std::string sourceId = info[1].As<Napi::String>().Utf8Value();
  source* expSource = state.sources[sourceId];

  bool result = exportSrc(path, expSource);
  return Napi::Boolean::New(env, result);
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
  exports.Set("getWaveform", Napi::Function::New(env, getWaveform));
  exports.Set("getImpulses", Napi::Function::New(env, getImpulses));
  exports.Set("loadSource", Napi::Function::New(env, loadSource));
  exports.Set("exportSource", Napi::Function::New(env, exportSource));
}