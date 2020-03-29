#include <vector>
#include <string>
#include <iostream>

extern "C"{
  #include <libavcodec/avcodec.h>
  #include <libavformat/avformat.h>
  #include <libswresample/swresample.h>
}

typedef struct{
  int streamIndex;
  AVCodec* aCodec;
  AVCodecContext* aCodecContext;
  uint8_t **streamOutput;
  float streamLength;
  int outputSize;
  int dataSize;
  AVSampleFormat aFormat;
  int aRate;
  uint64_t aLayout;
  int isPlanar;
  int channels;
  bool failed;
} streamInfo;

typedef struct{
  std::string sourceId;
  std::vector<float*>  channels;
  uint8_t ** data;
  int length;
} loadResponse;

void loadSrc(
  std::string path,
  std::string sourceId,
  std::vector<loadResponse *> &loadedSources
);