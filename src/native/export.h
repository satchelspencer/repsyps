#include <vector>
#include <string>
#include <iostream>

extern "C"{
  #include <libavcodec/avcodec.h>
  #include <libavformat/avformat.h>
  #include <libswresample/swresample.h>
}

#include "state.h"

void encode_audio_frame(
  AVFrame *frame,
  AVFormatContext *output_format_context,
  AVCodecContext *output_codec_context
);

void free_export(AVCodecContext* avctx, AVFormatContext* output_format_context);

bool exportSrc(std::string path, source* expSource);