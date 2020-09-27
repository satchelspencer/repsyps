#include "filter.h" 

static int FILTER_COUNT = OVERLAP_COUNT * CHANNEL_COUNT;

void setMixTrackFilter(std::string mixTrackId, streamState* state){
  if(
    state->mixTracks.find(mixTrackId) != state->mixTracks.end() &&
    state->mixTracks[mixTrackId] != NULL
  ){
    mixTrack* mixTrack = state->mixTracks[mixTrackId];
    float filter = mixTrack->playback->filter;

    if(filter == 0.5) mixTrack->hasFilter = false;
    else{
      float low_des = filter > 0.5 ? 0.0 : 1.0;
      float high_des = 1 - low_des;
      float cutoff_mag = abs(filter - 0.5);
      if(filter < 0.5) cutoff_mag = 0.5 - cutoff_mag;

      const unsigned int num_taps  =  121;      
      float h[num_taps];
      unsigned int num_bands = 2;
      float ft = estimate_req_filter_df(60, num_taps); //-60db
      float d = cutoff_mag - (filter > 0.5 ? ft : 0);
      float u =  cutoff_mag + (filter < 0.5 ? ft : 0);
      if(d < 0) d = 0;
      if(u > 0.5) u = 0.5;

      float bands[4] = { 0.0f, d, u, 0.5f };
      float des[2] = { low_des, high_des };
      float weights[2] = { 1.0f, 1.0f };
      liquid_firdespm_wtype wtype[2] = {LIQUID_FIRDESPM_FLATWEIGHT, LIQUID_FIRDESPM_FLATWEIGHT};

      firdespm_run(num_taps,num_bands,bands,des,weights,wtype,LIQUID_FIRDESPM_BANDPASS,h);

      firfilt_rrrf q = firfilt_rrrf_create(h,num_taps);
      if(mixTrack->filter != NULL) firfilt_rrrf_destroy(mixTrack->filter);
      mixTrack->filter = q;
      mixTrack->hasFilter = true;
    }
  }
}