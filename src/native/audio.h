#include <napi.h>
#include <math.h>
#include <iostream>
#include <thread>
#include <chrono>
#include "portaudio.h"

#include "state.h"
#include "filter.h"
#include "callback.h"
#include "separate.h"
#include "load.h"
#include "export.h"
#include "impdet.h"
#include "waveform.h"
#include "recording.h"

Napi::Value init(const Napi::CallbackInfo &info);
Napi::Value getOutputs(const Napi::CallbackInfo &info);
Napi::Value getDefaultOutput(const Napi::CallbackInfo &info);
Napi::Value start(const Napi::CallbackInfo &info);
void stop(const Napi::CallbackInfo &info);
void startPreview(const Napi::CallbackInfo &info);
void stopPreview(const Napi::CallbackInfo &info);
void updatePlayback(const Napi::CallbackInfo &info);
void updateTime(const Napi::CallbackInfo &info);
Napi::Value removeSource(const Napi::CallbackInfo &info);
void setMixTrack(const Napi::CallbackInfo &info);
Napi::Value removeMixTrack(const Napi::CallbackInfo &info);
Napi::Value getTiming(const Napi::CallbackInfo &info);
Napi::Value separateSource(const Napi::CallbackInfo &info);
void getWaveform(const Napi::CallbackInfo &info);
Napi::Value getImpulses(const Napi::CallbackInfo &info);
Napi::Value loadSource(const Napi::CallbackInfo &info);
Napi::Value exportSource(const Napi::CallbackInfo &info);
void startRecording(const Napi::CallbackInfo &info);
Napi::Value stopRecording(const Napi::CallbackInfo &info);
void syncToTrack(const Napi::CallbackInfo &info);

void InitAudio(Napi::Env env, Napi::Object exports);