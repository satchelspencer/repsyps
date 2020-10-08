#ifndef CONSTANTS_HEADER_H
#define CONSTANTS_HEADER_H

static bool REPSYS_LOG = false;
static const int CHANNEL_COUNT = 2;
static int OVERLAP_COUNT = 2;
static int WINDOW_STEP = 256;
static int MAX_ALPHA = 10;
static int WINDOW_SIZE =  OVERLAP_COUNT * WINDOW_STEP;
static int SAMPLE_RATE = 44100;
static int DELAY_MAX_SIZE = SAMPLE_RATE * 10;

#endif