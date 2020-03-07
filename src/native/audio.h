#include <napi.h>
#include <math.h>
#include "portaudio.h"

#include "state.h"
#include "callback.h"
#include "separate.h"

Napi::Value init(const Napi::CallbackInfo &info);
Napi::Value start(const Napi::CallbackInfo &info);
void stop(const Napi::CallbackInfo &info);
void updatePlayback(const Napi::CallbackInfo &info);
void addSource(const Napi::CallbackInfo &info);
Napi::Value removeSource(const Napi::CallbackInfo &info);
void setMixTrack(const Napi::CallbackInfo &info);
Napi::Value removeMixTrack(const Napi::CallbackInfo &info);
Napi::Value getTiming(const Napi::CallbackInfo &info);
Napi::Value separateSource(const Napi::CallbackInfo &info);
Napi::Value getDebug(const Napi::CallbackInfo &info);

void InitAudio(Napi::Env env, Napi::Object exports);