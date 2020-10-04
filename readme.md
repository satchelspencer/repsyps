## REPSYPS
real time mixing and syncronization
see [http://elldev.com/repsyps](http://elldev.com/repsyps)

## Developer Installation

repsyps depends on native libraries that must be installed manually for development:

 - [portaudio 2.0](http://portaudio.com/docs/v19-doxydocs/index.html) for realtime audio output
 - [liquid-dsp 1.3.2](https://github.com/jgaeddert/liquid-dsp) for filtering and other dsp
 - [libtensorflow 1.15.0](https://www.tensorflow.org/install/lang_c) for running A.I. source separation
 - [ffmpeg 4.2.2](http://ffmpeg.org/download.html) for decoding/encoding audio
 - [fftw 3.8](http://www.fftw.org/) fast fourier transform


### OSX Installation
- Xcode, [homebrew](https://brew.sh/) all of that
- autoconf `brew install autoconf automake`
- gfortran `brew cask install gfortran`
- nodejs 10+ [see installer](https://nodejs.org/en/download/)
- yarn `npm install -g yarn`

~~~ bash
# clone repsyps to a reasonable place
git clone https://github.com/satchelspencer/repsyps && cd repsyps

# downlad spleeter weights and test audio files
wget http://d1p4j3i2t4q5mq.cloudfront.net/lib.tar
tar xvzf lib.tar lib && rm lib.tar

# open the library dir
cd lib
export REPSYPS_LIBS=$(pwd)

# portaudio indtallation
wget http://portaudio.com/archives/pa_stable_v190600_20161030.tgz
tar xvzf pa_stable_v190600_20161030.tgz portaudio
rm pa_stable_v190600_20161030.tgz
cd portaudio
./configure --disable-mac-universal && make
cd ..

# liquid-dsp installation
git clone git://github.com/jgaeddert/liquid-dsp.git
cd liquid-dsp
./bootstrap.sh
./configure
make
cd ..

# download precompiled tensorflow binaries
mkdir libtensorflow && cd libtensorflow
wget https://storage.googleapis.com/tensorflow/libtensorflow/libtensorflow-cpu-darwin-x86_64-1.15.0.tar.gz
tar xvzf libtensorflow-cpu-darwin-x86_64-1.15.0.tar.gz
rm libtensorflow-cpu-darwin-x86_64-1.15.0.tar.gz
cd ..

# install ffmpeg
wget http://ffmpeg.org/releases/ffmpeg-4.2.2.tar.xz
tar xf ffmpeg-4.2.2.tar.xz
rm ffmpeg-4.2.2.tar.xz
cd ffmpeg-4.2.2
./configure --disable-autodetect
make
cd ..

# install fftw
wget http://www.fftw.org/fftw-3.3.8.tar.gz
tar xf fftw-3.3.8.tar.gz
rm fftw-3.3.8.tar.gz
cd fftw-3.3.8
./configure
make
cd ..

# install rubber-band
wget https://breakfastquay.com/files/releases/rubberband-1.9.0.tar.bz2
tar xf rubberband-1.9.0.tar.bz2
rm rubberband-1.9.0.tar.bz2
cd rubberband-1.9.0
mkdir lib
make -f Makefile.osx static
cd ..

## install libsamplerate
wget http://www.mega-nerd.com/SRC/libsamplerate-0.1.9.tar.gz
tar xf libsamplerate-0.1.9.tar.gz
rm libsamplerate-0.1.9.tar.gz
cd libsamplerate-0.1.9
./configure --disable-fftw --disable-sndfile --prefix $(pwd)
make
make install
cd ..

#install DSPFilters
git clone https://github.com/vinniefalco/DSPFilters
cd DSPFilters/shared/DSPFilters
cmake .
make

# back to project dir and install node deps
yarn
~~~

*make sure the lib folder has read/write permissions*

### Windows Installation
- nodejs 10+ [see installer](https://nodejs.org/en/download/)
- yarn `npm install -g yarn`
- download precompiled libraries [http://d1p4j3i2t4q5mq.cloudfront.net/lib-win.zip](http://d1p4j3i2t4q5mq.cloudfront.net/lib-win.zip) and extract it into the repsyps directory `/lib`
- run `yarn`
 
### Linux Installation
- tested on debian 
- autoconf `sudo apt-get install automake autoconf`
- nodejs 10+ [see installer](https://nodejs.org/en/download/)
- yarn `sudo npm install -g yarn`
- yasm `sudo apt-get install yasm`
- alsa `sudo apt-get install libasound2-dev`
- gfortran `sudo apt-get install gfortran `

~~~ bash
clone repsyps to a reasonable place
git clone https://github.com/satchelspencer/repsyps && cd repsyps

# downlad spleeter weights and test audio files
wget http://d1p4j3i2t4q5mq.cloudfront.net/lib.tar
tar -xvf lib.tar lib && rm lib.tar

# open the library dir
cd lib
export REPSYPS_LIBS=$(pwd)

# portaudio indtallation
wget http://portaudio.com/archives/pa_stable_v190600_20161030.tgz
tar xvzf pa_stable_v190600_20161030.tgz portaudio
rm pa_stable_v190600_20161030.tgz
cd portaudio
./configure --with-alsa CFLAGS=-fPIC && make
cd ..

# liquid-dsp installation??
git clone git://github.com/jgaeddert/liquid-dsp.git
cd liquid-dsp
./bootstrap.sh
./configure
make
cd ..

# download precompiled tensorflow binaries
mkdir libtensorflow && cd libtensorflow
wget https://storage.googleapis.com/tensorflow/libtensorflow/libtensorflow-gpu-linux-x86_64-1.15.0.tar.gz
tar xvzf libtensorflow-gpu-linux-x86_64-1.15.0.tar.gz
rm libtensorflow-gpu-linux-x86_64-1.15.0.tar.gz
cd ..

# install ffmpeg
wget http://ffmpeg.org/releases/ffmpeg-4.2.2.tar.xz
tar xf ffmpeg-4.2.2.tar.xz
rm ffmpeg-4.2.2.tar.xz
cd ffmpeg-4.2.2
./configure --disable-autodetect --enable-pic --enable-shared
make

# install fftw
wget http://www.fftw.org/fftw-3.3.8.tar.gz
tar xf fftw-3.3.8.tar.gz
rm fftw-3.3.8.tar.gz
cd fftw-3.3.8
./configure
make

# back to project dir and install node deps
cd ../..
yarn
~~~   