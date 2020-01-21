#include <napi.h>
#include "portaudio.h"
#include "state.h"

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