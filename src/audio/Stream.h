#include <napi.h>
#include "portaudio.h"

#include <unordered_map> 
#include <vector>

typedef struct{
  float volume;
  double time;
  bool playing;
  int period;
  double out;
} 
playback;

typedef struct{
  std::string sourceId;
  float volume;
  std::vector<int> chunks;
  int chunkIndex;
  double sample;
  float alpha;
  bool playing;
  bool aperiodic;
}
track;

typedef struct{
  std::vector<float*>  channels;
  int length;
}
source;

typedef struct{
  playback *playback;
  std::unordered_map<std::string, track*> tracks;
  std::unordered_map<std::string, source*> sources;
} 
streamState;

static streamState state;
static PaStream * gstream;

Napi::Value init(const Napi::CallbackInfo &info);
Napi::Value start(const Napi::CallbackInfo &info);
void stop(const Napi::CallbackInfo &info);
void updatePlayback(const Napi::CallbackInfo &info);
void addSource(const Napi::CallbackInfo &info);
Napi::Value removeSource(const Napi::CallbackInfo &info);
void setTrack(const Napi::CallbackInfo &info);
Napi::Value removeTrack(const Napi::CallbackInfo &info);
Napi::Value getTiming(const Napi::CallbackInfo &info);
Napi::Value getDebug(const Napi::CallbackInfo &info);

void InitAudio(Napi::Env env, Napi::Object exports);