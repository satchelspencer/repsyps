#include "ringbuffer.h"

ringbuffer* ringbuffer_new(int size){
  ringbuffer * buf = new ringbuffer{};
  buf->size = size;
  buf->head = 0;
  buf->tail = 0;
  for(int i=0;i<CHANNEL_COUNT;i++){
    float* buff = new float[buf->size];
    for(int j=0;j<buf->size;j++) buff[j] = 0;
    buf->channels.push_back(buff);
  }
  return buf;
}

void ringbuffer_delete(ringbuffer* buf){
  for(int i=0;i<CHANNEL_COUNT;i++){
    delete [] buf->channels[i];
  }
  delete buf;
}