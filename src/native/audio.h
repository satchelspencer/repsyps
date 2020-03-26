#include <napi.h>
#include <math.h>
#include <iostream>
#include "portaudio.h"
#include <complex.h>
#include <liquid.h>
#include <list>

#include "state.h"
#include "filter.h"
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
void getWaveform(const Napi::CallbackInfo &info);
Napi::Value getImpulses(const Napi::CallbackInfo &info);

void InitAudio(Napi::Env env, Napi::Object exports);