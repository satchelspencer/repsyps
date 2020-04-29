## Installation

repsyps depends on native libraries that must be installed manually for development:

 - [portaudio 2.0](http://portaudio.com/docs/v19-doxydocs/index.html) for realtime audio output
 - [liquid-dsp 1.3.2](https://github.com/jgaeddert/liquid-dsp) for filtering and other dsp
 - [libtensorflow 1.15.0](https://www.tensorflow.org/install/lang_c) for running A.I. source separation
 - [ffmpeg 4.2.2](http://ffmpeg.org/download.html) for decoding/encoding audio

### OSX Installation
 - prerequisites:
   - Xcode, [homebrew](https://brew.sh/) all of that
   - autoconf `brew install autoconf automake`
   - nodejs 10+ [see installer](https://nodejs.org/en/download/)
   - yarn `npm install -g yarn`
 - clone repsyps to a reasonable place `git clone https://github.com/satchelspencer/repsyps && cd repsyps`
 - repsyps uses [spleeter](https://github.com/deezer/spleeter) for source separation. pre-trained weights and test data can be downloaded by running the following command in the project root

    ~~~
    wget http://elldev.com/repsyps/lib.tar \
     && tar xvzf lib.tar lib && rm lib.tar
    ~~~
 - `cd lib` open the lib folder
 - `export REPSYPS_LIBS=$(pwd)` save the absolute path for suture reference
 - download the portaudio source into our libs folder
    
    ~~~
    wget http://portaudio.com/archives/pa_stable_v190600_20161030.tgz \
    && tar xvzf pa_stable_v190600_20161030.tgz portaudio \
    && rm pa_stable_v190600_20161030.tgz
    ~~~
 - open portaudio `cd portaudio`
 - configure and compile `./configure --disable-mac-universal && make`
 - `cd ../` back to our libs folder
 - clone the liquid-dsp source `git clone git://github.com/jgaeddert/liquid-dsp.git`
 - `cd liquid-dsp`
 - `./bootstrap.sh`
 - `./configure`
 - `make`
 - `cd ../` back to our libs folder
 
    ~~~
    mkdir libtensorflow && cd libtensorflow && \
    wget https://storage.googleapis.com/tensorflow/libtensorflow/libtensorflow-cpu-darwin-x86_64-1.15.0.tar.gz \
    && tar xvzf libtensorflow-cpu-darwin-x86_64-1.15.0.tar.gz \
    && rm libtensorflow-cpu-darwin-x86_64-1.15.0.tar.gz
    ~~~
 - `cd ../` back to libs

   ~~~
      wget http://ffmpeg.org/releases/ffmpeg-4.2.2.tar.xz
      tar xf ffmpeg-4.2.2.tar.xz
      rm ffmpeg-4.2.2.tar.xz
   ~~~
 - `cd ffmpeg-4.2.2`
 - `./configure --disable-autodetect`
 - `make`
 - `cd ../../` back to repsyps root folder
 - `yarn` install node dependencies and build native modules

### Linux (Debian) Installation

- prerequisites:
   - autoconf `sudo apt-get install automake autoconf`
   - nodejs 10+ [see installer](https://nodejs.org/en/download/)
   - yarn `sudo npm install -g yarn`
   - yasm `sudo apt-get install yasm`
   - alsa `sudo apt-get install libasound2-dev`
 - clone repsyps to a reasonable place `git clone https://github.com/satchelspencer/repsyps && cd repsyps`
 - repsyps uses [spleeter](https://github.com/deezer/spleeter) for source separation. pre-trained weights and test data can be downloaded by running the following command in the project root

    ~~~
    wget http://elldev.com/repsyps/lib.tar \
     && tar -xvf lib.tar lib && rm lib.tar
    ~~~
 - `cd lib` open the lib folder
 - `export REPSYPS_LIBS=$(pwd)` save the absolute path for suture reference
 - download the portaudio source into our libs folder
    
    ~~~
    wget http://portaudio.com/archives/pa_stable_v190600_20161030.tgz \
    && tar xvzf pa_stable_v190600_20161030.tgz portaudio \
    && rm pa_stable_v190600_20161030.tgz
    ~~~
 - open portaudio `cd portaudio`
 - configure and compile `./configure --with-alsa CFLAGS=-fPIC && make`
 - `cd ../` back to our libs folder
 - `cd ../` back to our libs folder
 - clone the liquid-dsp source `git clone git://github.com/jgaeddert/liquid-dsp.git`
 - `cd liquid-dsp`
 - `./bootstrap.sh`
 - `./configure`
 - `make`
 - `cd ../` back to our libs folder
 
    ~~~
    mkdir libtensorflow && cd libtensorflow && \
    wget https://storage.googleapis.com/tensorflow/libtensorflow/libtensorflow-gpu-linux-x86_64-1.15.0.tar.gz \
    && tar xvzf libtensorflow-gpu-linux-x86_64-1.15.0.tar.gz \
    && rm libtensorflow-gpu-linux-x86_64-1.15.0.tar.gz
    ~~~
 - `cd ../` back to libs

   ~~~
      wget http://ffmpeg.org/releases/ffmpeg-4.2.2.tar.xz
      tar xf ffmpeg-4.2.2.tar.xz
      rm ffmpeg-4.2.2.tar.xz
   ~~~
 - `cd ffmpeg-4.2.2`
 - `./configure --disable-autodetect --enable-pic --enable-shared`
 - `make`
 - `cd ../` back to libs
 - `brew cask install gfortran`

   ~~~
      wget http://www.fftw.org/fftw-3.3.8.tar.gz
      tar xf fftw-3.3.8.tar.gz
      rm fftw-3.3.8.tar.gz
   ~~~
 - `cd fftw-3.3.8`
 - `./configure`
 - `make`
 - `cd ../../` back to repsyps root folder
 - `yarn` install node dependencies and build native modules
