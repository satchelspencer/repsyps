#import "export.h"

void encode_audio_frame(
  AVFrame *frame,
  AVFormatContext *output_format_context,
  AVCodecContext *output_codec_context
){
  /* Packet used for temporary storage. */
  AVPacket output_packet;
  int ret;

  av_init_packet(&output_packet);
  output_packet.data = NULL;
  output_packet.size = 0;

  ret = avcodec_send_frame(output_codec_context, frame);
  if(ret == AVERROR_EOF){ //encoder has no more to do. all good
    av_packet_unref(&output_packet);
    return;
  }

  while (avcodec_receive_packet(output_codec_context, &output_packet) >= 0) {
    ret = av_write_frame(output_format_context, &output_packet);
    if(ret < 0){
      std::cout << "write error " << std::endl;
      break;
    }
  }
  av_packet_unref(&output_packet);
}

void free_export(AVCodecContext* avctx, AVFormatContext* output_format_context){
  avcodec_free_context(&avctx);
  avio_closep(&output_format_context->pb);
  avformat_free_context(output_format_context);
}

bool exportSrc(std::string path, source* expSource){
  bool result = false;
  unsigned int sourceLen = expSource->length; 

  int ret;
  AVFormatContext* output_format_context = NULL;
  AVCodecContext* avctx = NULL;
  AVIOContext* output_io_context = NULL;
  AVStream* stream = NULL;
  AVCodec* output_codec = NULL;

  /* open file */
  ret = avio_open(&output_io_context, path.c_str(), AVIO_FLAG_WRITE);
  if(ret < 0){
    std::cout << "could not open file " << std::endl;
    free_export(avctx, output_format_context);
    return result;
  }

  output_format_context = avformat_alloc_context();
  if(!output_format_context){
    std::cout << "could not alloc format context" << std::endl;
    free_export(avctx, output_format_context);
    return result;
  }

  output_format_context->oformat = av_guess_format(NULL, "yas.m4a", NULL);
  if(!output_format_context->oformat){
    std::cout << "couldn't find m4a format??" << std::endl;
    free_export(avctx, output_format_context);
    return result;
  }

  output_format_context->pb = output_io_context;
  output_format_context->url = av_strdup(path.c_str());

  output_codec = avcodec_find_encoder(AV_CODEC_ID_AAC);
  if(!output_codec){
    std::cout << "couldn't find AV_CODEC_ID_AAC" << std::endl;
    free_export(avctx, output_format_context);
    return result;
  }

  stream = avformat_new_stream(output_format_context, NULL);
  if(!stream){
    std::cout << "failed to create output stream" << std::endl;
    free_export(avctx, output_format_context);
    return result;
  }

  avctx = avcodec_alloc_context3(output_codec);
  if(!avctx){
    std::cout << "failed to create codec context" << std::endl;
    free_export(avctx, output_format_context);
    return result;
  }
  avctx->channels = 2;
  avctx->channel_layout = AV_CH_LAYOUT_STEREO;
  avctx->sample_rate = 44100;
  avctx->sample_fmt = AV_SAMPLE_FMT_FLTP;
  avctx->bit_rate = 250000;
  avctx->strict_std_compliance = FF_COMPLIANCE_EXPERIMENTAL;
  avctx->initial_padding = 1024;

  stream->time_base.den = 44100;
  stream->time_base.num = 1;

  if (output_format_context->oformat->flags & AVFMT_GLOBALHEADER)
    avctx->flags |= AV_CODEC_FLAG_GLOBAL_HEADER;


  ret = avcodec_open2(avctx, output_codec, NULL);
  if(ret < 0){
    std::cout << "could not open codec " << std::endl;
    free_export(avctx, output_format_context);
    return result;
  }

  ret = avcodec_parameters_from_context(stream->codecpar, avctx);
  if(ret < 0){
    std::cout << "could not copy stream parameters " << std::endl;
    free_export(avctx, output_format_context);
    return result;
  }

  /* write header */
  ret = avformat_write_header(output_format_context, NULL);
  if(ret < 0){
    std::cout << "failed to write header "  << std::endl;
    free_export(avctx, output_format_context);
    return result;
  }

  AVPacket* pkt = av_packet_alloc();
  AVFrame* frame = av_frame_alloc();
  frame->nb_samples = avctx->frame_size;
  frame->format = avctx->sample_fmt;
  frame->channel_layout = avctx->channel_layout;
  ret = av_frame_get_buffer(frame, 0);
  if(ret < 0){
    std::cout << "failed to allocate frame buffer " << std::endl;
    free_export(avctx, output_format_context);
    av_frame_free(&frame);
    av_packet_unref(pkt);
    return result;
  }

  int frameSample;
  float* frameSamples;
  int channelIndex;

  unsigned int sourceSample = 0;
  unsigned int srcReadSample;
  
  while(sourceSample < sourceLen){
    av_frame_make_writable(frame);
    frame->pts = sourceSample;
    for(channelIndex=0;channelIndex<avctx->channels;channelIndex++){
      frameSamples = (float*)frame->data[channelIndex];
      for(frameSample=0;frameSample<avctx->frame_size;frameSample++){
        srcReadSample = sourceSample + frameSample;
        frameSamples[frameSample] = srcReadSample < sourceLen
          ? expSource->channels[channelIndex][srcReadSample]
          : 0;
      }
    }
    encode_audio_frame(frame, output_format_context, avctx);
    sourceSample += avctx->frame_size;
  }
  encode_audio_frame(NULL, output_format_context, avctx);

  ret = av_write_trailer(output_format_context);
  if(ret < 0){
    std::cout << "failed to write trailer " << std::endl;
    free_export(avctx, output_format_context);
    av_frame_free(&frame);
    av_packet_unref(pkt);
    return result;
  }

  av_frame_free(&frame);
  av_packet_unref(pkt);
  avcodec_free_context(&avctx);
  avio_closep(&output_format_context->pb);
  avformat_free_context(output_format_context);

  return true;
}
