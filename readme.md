## installation

repsyps depends on native libraries that must be installed manually for development:

 - [portaudio 2.0](http://portaudio.com/docs/v19-doxydocs/index.html) for realtime audio output
 - [kfr 4.0.0](https://www.kfrlib.com/) for filtering and other dsp
 - [libtensorflow 1.15.0](https://www.tensorflow.org/install/lang_c) for running A.I. source separation

### Mac Installation
 - prerequisites:
   - Xcode, build essentials all of that
   - cmake `brew install cmake`
   - ninja `brew install ninja`
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
 - download the kfr source
  
    ~~~
    wget https://github.com/kfrlib/kfr/archive/master.zip \
    && unzip master.zip \
    && rm master.zip && mv kfr-master kfr
    ~~~
 - `mkdir kfr/build && cd kfr/build`
 - `cmake -GNinja -DENABLE_CAPI_BUILD=ON -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_COMPILER=clang++ ..`
 - `ninja kfr_capi`
 - `cd ../../` back to our libs folder
 
    ~~~
    mkdir libtensorflow && cd libtensorflow && \
    wget https://storage.googleapis.com/tensorflow/libtensorflow/libtensorflow-cpu-darwin-x86_64-1.15.0.tar.gz \
    && tar xvzf libtensorflow-cpu-darwin-x86_64-1.15.0.tar.gz \
    && rm libtensorflow-cpu-darwin-x86_64-1.15.0.tar.gz
    ~~~
 - `cd ../../` back to repsyps root folder
 - `yarn` install node dependencies and build native modules