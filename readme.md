## native library installation

rpsyps depends on native libraries [portaudio 2.0](http://portaudio.com/docs/v19-doxydocs/index.html) and [kfr 4.0.0](https://www.kfrlib.com/) for realtime audio output and dsp. the libraries are statically linked into the c++ native addon part of the project `/src/audio`. once both dependencies are compiled on the target system you should specify the location of the libraries and includes in the `binding.gyp` file. by default they are: 

 - portaudio includes: `$HOME/portaudio/include`
 - portaudio lib: `$HOME/portaudio/lib/.libs/libportaudio.a`
 - kfr includes`$HOME/kfr/include`
 - kfr lib `$HOME/kfr/build/lib/libkfr_capi_avx_pic.a`