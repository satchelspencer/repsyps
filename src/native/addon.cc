#include <napi.h>
#include "audio.h"

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  InitAudio(env, exports);
  return exports;
}

NODE_API_MODULE(addon, InitAll)