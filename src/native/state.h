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
} playback;

typedef struct{
  std::string sourceId;
  float volume;
  std::vector<int> chunks;
  float alpha;
  bool playing;
  bool aperiodic;
  int chunkIndex;
  double sample;
} track;


typedef struct{
  std::vector<float*>  channels;
  int length;
} source;

typedef struct{
  playback *playback;
  std::unordered_map<std::string, track*> tracks;
  std::unordered_map<std::string, source*> sources;
} streamState;

static streamState state;
static PaStream * gstream;