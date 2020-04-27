#include "audio.h" 

static streamState state;
static PaStream * gstream = NULL;

Napi::Value init(const Napi::CallbackInfo &info){
  std::string rootPath = info[0].As<Napi::String>().Utf8Value();
  init_separator(rootPath);

  Pa_Initialize();

  playback * newPlayback = new playback{};
  newPlayback->time = 0.;
  newPlayback->playing = false;
  newPlayback->period = 0;
  state.playback = newPlayback;

  int windowSize = 512;
  float* window = new float[windowSize];
  state.window = window;
  state.windowSize = windowSize;
  for(int i=0;i<windowSize;i++)
    window[i] = (cos(M_PI*2*(float(i)/(windowSize-1) + 0.5)) + 1)/2;

  
  float* pvWindow = new float[PV_WINDOW_SIZE];
  for(int i=0;i<PV_WINDOW_SIZE;i++)
    pvWindow[i] = (cos(M_PI*2*(float(i)/(PV_WINDOW_SIZE-1) + 0.5)) + 1)/2;
  state.pvWindow = pvWindow;

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

  state.recording = NULL;

  Napi::Env env = info.Env();
  return Napi::Number::New(env, 666);
}

Napi::Value getOutputs(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  Napi::Array outputs = Napi::Array::New(env);

  int deviceCount = Pa_GetDeviceCount();
  int outputIndex = 0;
std::cout <<"DC " << deviceCount << std::endl;
  for(int deviceIndex=0;deviceIndex<deviceCount;deviceIndex++){
    const PaDeviceInfo* dinfo = Pa_GetDeviceInfo(deviceIndex);
    if(dinfo->maxOutputChannels >= 2){
       Napi::Object output = Napi::Object::New(env);
      output.Set("name", dinfo->name);
      output.Set("index", deviceIndex);
      output.Set("channels", dinfo->maxOutputChannels);
      outputs.Set(outputIndex++, output);
    }
  }
  return outputs;
}

Napi::Value getDefaultOutput(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  return Napi::Number::New(env, Pa_GetDefaultOutputDevice());
}

Napi::Value start(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  int deviceIndex = info[0].As<Napi::Number>().Int32Value();
  if(REPSYS_LOG) std::cout << "start " << deviceIndex << std::endl;

  PaStreamParameters outputParameters;
  outputParameters.device = deviceIndex;
  outputParameters.channelCount = 2; /* stereo output */
  outputParameters.sampleFormat = paFloat32; /* 32 bit floating point output */
  outputParameters.suggestedLatency = Pa_GetDeviceInfo( outputParameters.device )->defaultHighOutputLatency;
  outputParameters.hostApiSpecificStreamInfo = NULL;

  if(gstream != NULL){
    if(REPSYS_LOG) std::cout << "stopping old stream" << std::endl;
    Pa_StopStream(gstream);
  }

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
  if(REPSYS_LOG) std::cout << "playback" << std::endl;
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

void updateTime(const Napi::CallbackInfo &info){
  if(REPSYS_LOG) std::cout << "update time" << std::endl;
  float time = info[0].As<Napi::Number>().DoubleValue();
  bool relative =  info[1].As<Napi::Boolean>().Value();
  int chunkOffset = floor(time);
  int chunkCount;
  state.playback->time = relative ? state.playback->time + time : time;
  mixTrack* mixTrack;
  for(auto mixTrackPair: state.mixTracks){
    mixTrack = mixTrackPair.second;
    if(
      mixTrack != NULL
      && mixTrack->playback->playing 
      && state.sources.find(mixTrackPair.first) != state.sources.end() 
      && state.sources[mixTrackPair.first] != NULL
    ){
      if(relative){
        chunkCount = mixTrack->playback->chunks.size() / 2;
        mixTrack->playback->chunkIndex = 
          (mixTrack->playback->chunkIndex + chunkOffset + chunkCount) % chunkCount;
        if(mixTrack->playback->chunkIndex == 0) mixTrack->playback->chunkIndex = -1;
      }else{
        mixTrack->playback->chunkIndex = -1;
      }
    }
  }
}

Napi::Value removeSource(const Napi::CallbackInfo &info){
  if(REPSYS_LOG) std::cout << "rm src" << std::endl;
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
  playback->unpause = false;
  return playback;
}

void setMixTrackPlayback(mixTrackPlayback * playback, Napi::Value value){
  if(REPSYS_LOG) std::cout << "track playback" << std::endl;
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
    }else if(propNameStr == "unpause"){
      playback->unpause = value.As<Napi::Boolean>().Value();
    }
  }
}

void setMixTrack(const Napi::CallbackInfo &info){
  std::string mixTrackId = info[0].As<Napi::String>().Utf8Value();
  Napi::Object update = info[1].As<Napi::Object>();
  Napi::Value playback = update.Get("playback");
  Napi::Value nextPlayback = update.Get("nextPlayback");
  if(REPSYS_LOG) std::cout << "set track " << mixTrackId << std::endl;

  if(state.mixTracks.find(mixTrackId) == state.mixTracks.end() || state.mixTracks[mixTrackId] == NULL){
    mixTrack * newMixTrack = new mixTrack{};
    newMixTrack->playback = initMixTrackPlayback();
    newMixTrack->nextPlayback = NULL;
    newMixTrack->hasNext = false;
    newMixTrack->hasFilter = false;
    newMixTrack->sample = 0;
    newMixTrack->phase = 0.;
    newMixTrack->overlapIndex = 0;
    newMixTrack->removed = false;
    newMixTrack->safe = false;

    for(int channelIndex=0;channelIndex<CHANNEL_COUNT;channelIndex++){
      pvState* newPvState = new pvState{};
      newPvState->lastPhaseTimeDelta = new float[PV_WINDOW_SIZE];
      newPvState->lastPFFT = new float[PV_WINDOW_SIZE*2];
      newPvState->currentPFFT = new float[PV_WINDOW_SIZE*2];
      newPvState->nextPFFT = new float[PV_WINDOW_SIZE*2];

      for(int i=0;i<PV_WINDOW_SIZE;i++) newPvState->lastPhaseTimeDelta[i] = 0;
      for(int i=0;i<PV_WINDOW_SIZE * 2;i++){
         newPvState->lastPFFT[i] = 0;
         newPvState->currentPFFT[i] = 0;
         newPvState->nextPFFT[i] = 0;
      }
      newMixTrack->pvStates.push_back(newPvState);
    }

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
  if(REPSYS_LOG) std::cout << "rm track" << std::endl;
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

  if(
    state.recording != NULL 
    && state.recording->chunkIndex == state.recording->chunks.size()-1
  ){
    recordChunk* currentChunk = state.recording->chunks[state.recording->chunkIndex];
    if(currentChunk->used > currentChunk->size * REC_REALLOC_THRESH){ 
      allocateChunk(state.recording);
    }
  }
  timings.Set("recTime", state.recording ? state.recording->length : 0);

  source* mixTrackSource;
  unsigned int channelIndex;
  for(auto sourcesPair: state.sources){
    mixTrackSource = sourcesPair.second;
    if(mixTrackSource && mixTrackSource->safe){
      if(REPSYS_LOG) std::cout << "free source " << sourcesPair.first << std::endl;
      if(mixTrackSource->data != NULL){
        av_freep(&mixTrackSource->data[0]);
        av_freep(&mixTrackSource->data);
      }else{
        for(channelIndex=0;channelIndex<mixTrackSource->channels.size();channelIndex++){
          delete [] mixTrackSource->channels[channelIndex];
        }
      }
      state.sources[sourcesPair.first] = NULL;
      delete mixTrackSource;
    }
  }

  mixTrack* mixTrack;
  for(auto mixTrackPair: state.mixTracks){
    mixTrack = mixTrackPair.second;
    if(mixTrack == NULL) continue;
    if(mixTrack->safe){
      if(REPSYS_LOG) std::cout << "free track " << mixTrackPair.first << std::endl;
      state.mixTracks[mixTrackPair.first] = NULL;
      if(mixTrack->hasFilter){
        for(unsigned int filterIndex = 0;filterIndex<mixTrack->filters.size();filterIndex++){
          firfilt_rrrf_destroy(mixTrack->filters[filterIndex]);
        }
      }
      for(pvState* pv : mixTrack->pvStates){
        delete [] pv->lastPhaseTimeDelta;
        delete [] pv->lastPFFT;
        delete [] pv->currentPFFT;
        delete [] pv->nextPFFT;
      }
      delete mixTrack;
    }else if(mixTrack->playback->playing){
      Napi::Object mixTrackState = Napi::Object::New(env);
      mixTrackState.Set("sample", mixTrack->sample);

      mixTrackState.Set("playback", getPlaybackTiming(env, mixTrack->playback));
      if(mixTrack->hasNext)
        mixTrackState.Set("nextPlayback", getPlaybackTiming(env, mixTrack->nextPlayback));
      else mixTrackState.Set("nextPlayback", env.Null());

      tracktimings.Set(mixTrackPair.first, mixTrackState);
    }
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
    newSource->safe = false;
    newSource->data = NULL;
    for(unsigned int i=0;i<channelCount;i++){
      newSource->channels.push_back(outChannels[j*sepCount + i]);
    }
    state.sources[sourceTrackId] = newSource;
  }
}

void getWaveform(const Napi::CallbackInfo &info){
  //if(REPSYS_LOG) std::cout << "waveform" << std::endl;
  std::string sourceId = info[0].As<Napi::String>().Utf8Value();
  int start = info[1].As<Napi::Number>().Int32Value();
  float scale = info[2].As<Napi::Number>().FloatValue();
  Napi::TypedArray buff = info[3].As<Napi::TypedArray>();

  float* dest = reinterpret_cast<float*>(buff.ArrayBuffer().Data());
  int destLen = buff.ByteLength() / sizeof(float); //length of buffer (2x samples)
  int samplesWidth = (destLen / 2) * scale; 
  int startOffset;

  if(sourceId == "_recording" && state.recording != NULL){ //recording monitor
    recordChunk* chunk = state.recording->chunks[state.recording->chunkIndex];
    float* source = chunk->channels[0];
    int sourceLen = chunk->used;
    startOffset = REC_CHUNK_SAMPLES * state.recording->chunkIndex;
    minMaxWaveform(scale, start - startOffset, source, sourceLen, dest, destLen, false, 1);
    
    /* draw previous chunk if needed */
    int prevLength = samplesWidth - sourceLen; //length of prev chunk visible
    if(state.recording->chunkIndex > 0 && prevLength > 0){
      chunk = state.recording->chunks[state.recording->chunkIndex - 1];
      startOffset -= REC_CHUNK_SAMPLES; //once chunk back
      minMaxWaveform(scale, start-startOffset,  chunk->channels[0], chunk->used, dest, destLen, true, 1);
    }
  }else if(state.sources.find(sourceId) != state.sources.end() && state.sources[sourceId] != NULL){
    float* source = state.sources[sourceId]->channels[0];
    int sourceLen = state.sources[sourceId]->length;
    minMaxWaveform(scale, start, source, sourceLen, dest, destLen, false, 0.75);
  }
}

Napi::Value getImpulses(const Napi::CallbackInfo &info){
  if(REPSYS_LOG) std::cout << "impulses" << std::endl;
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
        newSource->safe = false;
        newSource->data = res->data;
        for(unsigned int i=0;i<res->channels.size();i++){
          newSource->channels.push_back(res->channels[i]);
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
  if(REPSYS_LOG) std::cout << "load " << sourceId << std::endl;

  LoadWorker* loadWorker = new LoadWorker(env, path, sourceId);
  auto promise = loadWorker->GetPromise();
  loadWorker->Queue();
  return promise;
}

Napi::Value exportSource(const Napi::CallbackInfo &info){
  if(REPSYS_LOG) std::cout << "export" << std::endl;
  Napi::Env env = info.Env();
  std::string path = info[0].As<Napi::String>().Utf8Value();
  std::string sourceId = info[1].As<Napi::String>().Utf8Value();
  source* expSource = state.sources[sourceId];

  bool result = exportSrc(path, expSource);
  return Napi::Boolean::New(env, result);
}

void startRecording(const Napi::CallbackInfo &info){
  if(state.recording == NULL){
    recording* newRecording = new recording{};
    newRecording->fromSource = info[0].ToBoolean().Value();
     if(REPSYS_LOG) std::cout << "rec fsource: " << newRecording->fromSource << std::endl;
    
    if(newRecording->fromSource){
      newRecording->fromSourceId = info[0].As<Napi::String>().Utf8Value();
      newRecording->fromSourceOffset = state.mixTracks[newRecording->fromSourceId]->sample;
    }else newRecording->fromSourceOffset = 0;

    newRecording->started = !newRecording->fromSource;
    newRecording->chunkIndex = 0;
    newRecording->length = 0;
    allocateChunk(newRecording);
    state.recording = newRecording;
  }
}

Napi::Value stopRecording(const Napi::CallbackInfo &info){
  Napi::Env env = info.Env();
  std::string sourceId = info[0].As<Napi::String>().Utf8Value();
  Napi::Array bounds = Napi::Array::New(env);

  if(state.recording != NULL){
    if(REPSYS_LOG) std::cout << "stop rec" << std::endl;
    recording* rec = state.recording; // save reference to recording
     state.recording = NULL; // immediately set to null so the callback won't record to it anymore

    unsigned int offset = rec->fromSourceOffset;
    int recLength = offset + rec->length; //offset includes appended track
    source * fromSource = NULL;
    if(rec->fromSource) fromSource = state.sources[rec->fromSourceId];
    
    /* create new source to put recording into */
    source * newSource = new source{};
    newSource->length = recLength;
    newSource->removed = false;
    newSource->safe = false;
    newSource->data = NULL;

    unsigned int chunkIndex;
    unsigned int sampleIndex;
    int chunkSampleIndex;
    recordChunk* chunk;
    float sampleValue;

    /* copy from the individual chunks into contiguous channels */
    for(unsigned int channelIndex=0;channelIndex<2;channelIndex++){
      float* channel = new float[recLength];

      if(rec->fromSource){ //copy from starting source
        for(sampleIndex=0;sampleIndex<offset;sampleIndex++)
          channel[sampleIndex] = fromSource->channels[channelIndex][sampleIndex];
      }

      sampleIndex = offset;
      for(chunkIndex=0;chunkIndex<rec->chunks.size();chunkIndex++){
        chunk = rec->chunks[chunkIndex];
        for(chunkSampleIndex=0;chunkSampleIndex<chunk->used;chunkSampleIndex++){
          sampleValue = chunk->channels[channelIndex][chunkSampleIndex];
          if(sampleValue > 1) sampleValue = 1;
          if(sampleValue < -1) sampleValue = -1;
          channel[sampleIndex] = sampleValue;
          sampleIndex++;
        }
        delete [] chunk->channels[channelIndex];
      }
      newSource->channels.push_back(channel);
    }
    state.sources[sourceId] = newSource;
    
    /* copy bounds */
    int boundIndex = 0;
    int chunkBoundIndex;
    for(chunkIndex=0;chunkIndex<rec->chunks.size();chunkIndex++){
      chunk = rec->chunks[chunkIndex];
      for(chunkBoundIndex=0;chunkBoundIndex<chunk->boundsCount;chunkBoundIndex++){
        bounds.Set(boundIndex, chunk->bounds[chunkBoundIndex] + offset);
        boundIndex++;
      }
      delete chunk;
    }
    delete rec;
  }
  return bounds;
}

void syncToTrack(const Napi::CallbackInfo &info){
  std::string trackId = info[0].As<Napi::String>().Utf8Value();
  int start = info[1].As<Napi::Number>().Int32Value();
  int end = info[2].As<Napi::Number>().Int32Value();

  mixTrack* track = state.mixTracks[trackId];
  float period = (end - start) * track->playback->alpha;
  float trackPhase = (track->sample - start) / period;
  state.playback->time = floor(state.playback->time)+trackPhase;
  state.playback->period = period;
  track->playback->aperiodic = false;
  track->playback->chunks[0] = start;
  track->playback->chunks[1] = period;
  track->playback->chunkIndex = -1;
}

void InitAudio(Napi::Env env, Napi::Object exports){ 
  exports.Set("init", Napi::Function::New(env, init));
  exports.Set("getOutputs", Napi::Function::New(env, getOutputs));
  exports.Set("getDefaultOutput", Napi::Function::New(env, getDefaultOutput));
  exports.Set("start", Napi::Function::New(env, start));
  exports.Set("stop", Napi::Function::New(env, stop));
  exports.Set("updatePlayback", Napi::Function::New(env, updatePlayback));
  exports.Set("updateTime", Napi::Function::New(env, updateTime));
  exports.Set("removeSource", Napi::Function::New(env, removeSource));
  exports.Set("setMixTrack", Napi::Function::New(env, setMixTrack));
  exports.Set("removeMixTrack", Napi::Function::New(env, removeMixTrack));
  exports.Set("getTiming", Napi::Function::New(env, getTiming));
  exports.Set("separateSource", Napi::Function::New(env, separateSource));
  exports.Set("getWaveform", Napi::Function::New(env, getWaveform));
  exports.Set("getImpulses", Napi::Function::New(env, getImpulses));
  exports.Set("loadSource", Napi::Function::New(env, loadSource));
  exports.Set("exportSource", Napi::Function::New(env, exportSource));
  exports.Set("startRecording", Napi::Function::New(env, startRecording));
  exports.Set("stopRecording", Napi::Function::New(env, stopRecording));
  exports.Set("syncToTrack", Napi::Function::New(env, syncToTrack));
}
