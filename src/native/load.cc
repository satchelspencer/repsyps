#include "load.h"

void loadSrc(
  std::string path,
  std::string sourceId,
  std::vector<loadResponse *> &loadedSources
){
  int ret;
  AVFormatContext *pFormatCtx = NULL;

  /* open file */
  ret = avformat_open_input(&pFormatCtx, path.c_str(), NULL, 0);
  if(ret < 0){
    std::cout << "could not open input " << av_err2str(ret) << std::endl;
    return;
  }

  /* automatically find streams info */
  ret = avformat_find_stream_info(pFormatCtx, NULL);
   if(ret < 0){
    std::cout << "could not find stream info " << av_err2str(ret) << std::endl;
    return;
  }

  if(REPSYS_LOG) av_dump_format(pFormatCtx, 0, path.c_str(), 0);

  std::vector<streamInfo *> streamInfos;
  for(unsigned int i=0; i<pFormatCtx->nb_streams; i++){
    if(pFormatCtx->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_AUDIO){
      streamInfo * ainfo = new streamInfo{};
      ainfo->streamIndex = i;
      ainfo->streamOutput = NULL;
      ainfo->failed = false;

      /* stream length in samples based on timebase */
      ainfo->streamLength = pFormatCtx->streams[i]->time_base.num/(float)pFormatCtx->streams[i]->time_base.den 
        * pFormatCtx->streams[i]->duration; //in samples
      
      AVCodecParameters* aCodecParameters = pFormatCtx->streams[i]->codecpar;
      ainfo->aCodec = avcodec_find_decoder(aCodecParameters->codec_id);
      if(!ainfo->aCodec){
        std::cout << "failed to find codec on #" << i << std::endl;
        ainfo->failed = true;
        continue;
      }

      ainfo->aCodecContext = avcodec_alloc_context3(ainfo->aCodec);
      if(avcodec_parameters_to_context(ainfo->aCodecContext, aCodecParameters) != 0){
        std::cout << "failed to copy codec params on #" << i << std::endl;
        ainfo->failed = true;
        continue;
      }

      /* guess the channel layout if it is missing */
      if(ainfo->aCodecContext->channel_layout == 0)
        ainfo->aCodecContext->channel_layout = av_get_default_channel_layout(ainfo->aCodecContext->channels);
      
      if(avcodec_open2(ainfo->aCodecContext, ainfo->aCodec, NULL) < 0){
        std::cout << "failed to copy codec params on #" << i << std::endl;
        ainfo->failed = true;
        continue;
      }
      streamInfos.push_back(ainfo);
    }
  }

  AVPacket* pkt = av_packet_alloc();
  AVFrame *aFrame = av_frame_alloc();

  int lineSize;
  int channelIndex;
  unsigned int aStreamIndex;

  streamInfo * ainfo;
  while (av_read_frame(pFormatCtx, pkt) >= 0) {
    for(aStreamIndex=0;aStreamIndex<streamInfos.size();aStreamIndex++){
      ainfo = streamInfos[aStreamIndex];

      if(!ainfo->failed && ainfo->streamIndex == pkt->stream_index){
        /* send packet to decoder context */
        ret = avcodec_send_packet(ainfo->aCodecContext, pkt);
        if(ret < 0){
          std::cout << "error sending packet to decoder on #" << aStreamIndex << std::endl;
          ainfo->failed = true;
          continue;
        }

        /* get raw data frame from decoder */
        ret = avcodec_receive_frame(ainfo->aCodecContext, aFrame);
        if(ret == AVERROR(EAGAIN) || ret == AVERROR_EOF) continue; //file error. just skip
        else if (ret < 0) {
          std::cout << "decoding error on #" << aStreamIndex << std::endl;
          ainfo->failed = true;
          continue;
        }

        /* on recieveing first frame */ 
        if(ainfo->streamOutput == NULL){ 
          ainfo->aFormat = (AVSampleFormat)aFrame->format;
          ainfo->isPlanar = av_sample_fmt_is_planar(ainfo->aFormat);
          ainfo->aRate = aFrame->sample_rate;
          ainfo->aLayout = aFrame->channel_layout;
          ainfo->dataSize = av_get_bytes_per_sample(ainfo->aFormat);
          ainfo->channels = aFrame->channels;
          ainfo->outputSize = 0;
          ret = av_samples_alloc_array_and_samples(
            &ainfo->streamOutput,
            &lineSize,
            aFrame->channels,
            ainfo->aRate*ainfo->streamLength,
            ainfo->aFormat,
            0
          );
          if(ret < 0){
            std::cout << "could not allocate sample buffer for " << aStreamIndex << std::endl;
            ainfo->failed = true;
            continue;
          }
        }

        /* copy data from frame to buffer */
        if(aFrame->nb_samples > 0){
          /* planar audio has a separate array for each channel */
          if(ainfo->isPlanar){
            for(channelIndex=0;channelIndex<aFrame->channels;channelIndex++){ 
              memcpy(
                ainfo->streamOutput[channelIndex] + ainfo->outputSize,
                aFrame->data[channelIndex],
                ainfo->dataSize * aFrame->nb_samples
              );
            }
            ainfo->outputSize += ainfo->dataSize * aFrame->nb_samples;
          }else{
            /* non planar audio is interleaved */
            memcpy(
              ainfo->streamOutput[0] + ainfo->outputSize,
              aFrame->data[0],
              ainfo->dataSize * aFrame->nb_samples * aFrame->channels
            );
            ainfo->outputSize += ainfo->dataSize * aFrame->nb_samples * aFrame->channels;
          }
        }
        av_packet_unref(pkt);
      }
    }
  }
  av_frame_free(&aFrame);
  av_packet_free(&pkt);
  avformat_close_input(&pFormatCtx);
  
  /* output constants */
  int outRate = 44100;
  int outChannels = 2;
  AVSampleFormat outFmt = AV_SAMPLE_FMT_FLTP;
  uint64_t outLayout = AV_CH_LAYOUT_STEREO;

  int streamSamples;
  int resampledSamples;
  for(aStreamIndex=0;aStreamIndex<streamInfos.size();aStreamIndex++){
    ainfo = streamInfos[aStreamIndex];
    if(ainfo->failed) continue; //failed some point earlier

    uint8_t **resampledOutput = NULL;
    streamSamples = ainfo->outputSize / ainfo->dataSize;
    if(!ainfo->isPlanar) streamSamples /= ainfo->channels; //planar is interleaved
    resampledSamples = av_rescale_rnd(streamSamples, outRate, ainfo->aRate, AV_ROUND_UP);

    ret = av_samples_alloc_array_and_samples(
      &resampledOutput,
      &lineSize,
      outChannels, //channels
      resampledSamples,
      outFmt, //floatingpoint
      0
    );
    if(ret < 0){
      std::cout << "could not allocate resampling buffer for " << aStreamIndex << std::endl;
      continue;
    }

    /* setup resampler */
    SwrContext *swr = swr_alloc_set_opts(
      NULL, 
      outLayout, // out_ch_layout
      outFmt, // out_sample_fmt
      outRate, // out_sample_rate
      ainfo->aLayout, // in_ch_layout
      ainfo->aFormat, // in_sample_fmt
      ainfo->aRate, // in_sample_rate
      0, // log_offset
      NULL
    );   
    ret = swr_init(swr);    
    if(ret < 0){
      std::cout << "could not initalize resampler " << std::endl;
      continue;
    }
    
    /* run the resampler */
    ret = swr_convert(
      swr,
      resampledOutput,
      resampledSamples,
      (const uint8_t **)ainfo->streamOutput,
      streamSamples
    );

    swr_free(&swr); //free if it worked or not

    if(ret < 0){
      std::cout << "resampling error " << av_err2str(ret) << std::endl;
      continue;
    }
    
    //success! add source
    std::string sourceTrackId = sourceId + (aStreamIndex > 0?":"+std::to_string(aStreamIndex):"");
    loadResponse* res = new loadResponse{};
    res->length = resampledSamples;
    res->sourceId = sourceTrackId;
    for(int i=0;i<outChannels;i++){
      // float* resampled = (float*)resampledOutput[i];
      // float * channel = new float[res->length];
      // for(int s=0;s<res->length;s++) channel[s] = resampled[s];
      res->channels.push_back((float*)resampledOutput[i]);
    }
    std::cout << resampledSamples * sizeof(float) * outChannels << std::endl;
    res->data = resampledOutput;
    loadedSources.push_back(res);
  }  

  /* free all streamInfos */
  for(aStreamIndex=0;aStreamIndex<streamInfos.size();aStreamIndex++){
    avcodec_free_context(&streamInfos[aStreamIndex]->aCodecContext);
    av_freep(&streamInfos[aStreamIndex]->streamOutput[0]);
    av_freep(&streamInfos[aStreamIndex]->streamOutput);
    delete streamInfos[aStreamIndex];
  }
}