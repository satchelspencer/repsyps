#include <vector>

#include "constants.h"

#ifndef RINGBUFFER_HEADER_H
#define RINGBUFFER_HEADER_H

typedef struct{
  std::vector<float*>  channels;
  int size;
  int head;
  int tail;
} ringbuffer;

ringbuffer* ringbuffer_new(int size);

void ringbuffer_clear(ringbuffer* buf);

void ringbuffer_delete(ringbuffer* buf);

#endif