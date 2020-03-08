#include <napi.h>
#include "portaudio.h"
#include <liquid.h>
#include <unordered_map> 
#include <vector>
#include "state.h"

#ifndef FILTER_HEADER_H
#define FILTER_HEADER_H

void setMixTrackFilter(mixTrack * mixTrack, float filter);

#endif