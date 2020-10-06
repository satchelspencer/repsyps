#ifndef CONSTANTS_HEADER_H
#define CONSTANTS_HEADER_H

static bool REPSYS_LOG = false;
static int CHANNEL_COUNT = 2;
static int OVERLAP_COUNT = 2;
static int WINDOW_STEP = 256;
static int MAX_ALPHA = 10;
static int WINDOW_SIZE =  OVERLAP_COUNT * WINDOW_STEP;
#define PV_WINDOW_SIZE 2048
static int ANALYSIS_SIZE = PV_WINDOW_SIZE * 4;
static int PV_MAX_FREQ = (PV_WINDOW_SIZE / 2) - 1;
static int PV_RATE = 44100;
static float PV_ABSTOL = 1e-3;
static float PV_FREQ_STEP = PV_RATE / (float)(PV_WINDOW_SIZE);
static int DELAY_MAX_SIZE = PV_RATE * 10;

#endif