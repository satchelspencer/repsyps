#include "stretcher.h"
#include "ringbuffer.h"

REStretcher::REStretcher(){
  int e;
  resampler = src_new(1, CHANNEL_COUNT, &e);

  inputBuffer = new float[MAX_ALPHA*WINDOW_SIZE*2];
  outputBuffer = new float[MAX_ALPHA*WINDOW_SIZE*2];

  data = new SRC_DATA{};
  data->end_of_input = 0;
  data->src_ratio = 1;
  data->data_in = inputBuffer;
  data->data_out = outputBuffer;
  data->output_frames = WINDOW_SIZE * 16;

  outputRing = ringbuffer_new(data->output_frames * 2);
}

REStretcher::~REStretcher(){
  src_delete(resampler);
  delete[] inputBuffer;
  delete[] outputBuffer;
  ringbuffer_delete(outputRing);
}

int REStretcher::getAvailable(){
  if(outputRing->head >= outputRing->tail) return outputRing->head - outputRing->tail;
  else return outputRing->head + (outputRing->size - outputRing->tail);
}

int REStretcher::getRequired(){
  return WINDOW_SIZE / data->src_ratio;
}

int REStretcher::getTimeRatio(){
  return data->src_ratio;
}

void REStretcher::setTimeRatio(double ratio){
  src_set_ratio(resampler, ratio);
  data->src_ratio = ratio;
}

void REStretcher::setPitchRatio(double ratio){}

void REStretcher::reset(){}

void REStretcher::process(float **input, int samples){
  float* head = inputBuffer;
  for(int sample=0;sample<samples;sample++){
    for(int c=0;c<CHANNEL_COUNT;c++){
      *(head++) = input[c][sample];
    }
  }
  data->input_frames = samples;
  src_process(resampler, data);
  int channel = 0;
  for(int os=0;os<data->output_frames_gen * CHANNEL_COUNT;os++){
    outputRing->channels[channel][outputRing->head] = outputBuffer[os];
    channel = (channel + 1) % CHANNEL_COUNT;
    if(channel == 0) outputRing->head = (outputRing->head + 1) % outputRing->size;
  }
}

void REStretcher::retrieve(float **output, int samples){
  for(int sample=0;sample<samples;sample++){
    for(int c=0;c<CHANNEL_COUNT;c++){
      output[c][sample] = outputRing->channels[c][outputRing->tail];
      outputRing->channels[c][outputRing->tail] = 0;
    }
    outputRing->tail = (outputRing->tail + 1) % outputRing->size;
  }
}

PVStretcher::PVStretcher(){
  stretcher = new RubberBand::RubberBandStretcher(
    SAMPLE_RATE,
    CHANNEL_COUNT,
    RubberBand::RubberBandStretcher::OptionProcessRealTime |
    RubberBand::RubberBandStretcher::OptionDetectorCompound ,
    1.0,
    1.0
  );
  stretcher->setTransientsOption(RubberBand::RubberBandStretcher::OptionTransientsCrisp);
  stretcher->setPhaseOption(RubberBand::RubberBandStretcher::OptionPhaseLaminar);
  stretcher->setDetectorOption(RubberBand::RubberBandStretcher::OptionDetectorCompound);
  stretcher->setFormantOption(RubberBand::RubberBandStretcher::OptionFormantPreserved);
}

int PVStretcher::getAvailable(){
  return stretcher->available();
}

int PVStretcher::getRequired(){
  return stretcher->getSamplesRequired();
}

int PVStretcher::getTimeRatio(){
  return stretcher->getTimeRatio();
}

void PVStretcher::setTimeRatio(double ratio){
  stretcher->setTimeRatio(ratio);
}

void PVStretcher::setPitchRatio(double ratio){
  stretcher->setPitchScale(ratio);
}

void PVStretcher::reset(){
  stretcher->reset();
}

void PVStretcher::process(float **input, int samples){
  stretcher->process(input, samples, false);
}

void PVStretcher::retrieve(float **output, int samples){
  stretcher->retrieve(output, samples);
}