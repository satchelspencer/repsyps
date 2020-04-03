#include "state.h"

static int REC_CHUNK_SAMPLES = 44100*10;
static int REC_CHUNK_BOUNDS = 100;
static float REC_REALLOC_THRESH = 0.8;

void allocateChunk(recording* recording);