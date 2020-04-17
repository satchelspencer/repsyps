{
  "targets": [
    {
      "target_name": "audio",
      "variables": {
        "libsdir": "<@(PRODUCT_DIR)/../../lib"
      },
      "sources": [
        "src/native/addon.cc",
        "src/native/audio.cc",
        "src/native/callback.cc",
        "src/native/filter.cc",
        "src/native/separate.cc",
        "src/native/load.cc",
        "src/native/export.cc",
        "src/native/impdet.cc",
        "src/native/waveform.cc",
        "src/native/recording.cc"
      ],
      'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ],
      "conditions": [
        [ "OS==\"win\"", {
          "include_dirs": [
            "src/native",
            "<@(libsdir)/portaudio/include",
            "<@(libsdir)/libtensorflow/include",
            "<@(libsdir)/liquid-dsp/include/liquid",
            "<@(libsdir)/ffmpeg/include",
            "<!@(node -p \"require('node-addon-api').include\")"
          ],
          "link_settings":{
            "libraries":[
              "<@(libsdir)/libtensorflow/lib/tensorflow.lib",
              "<@(libsdir)/portaudio/portaudio_x64.lib",
              "<@(libsdir)/liquid-dsp/libliquid.lib",
              "<@(libsdir)/ffmpeg/lib/avutil.lib",
              "<@(libsdir)/ffmpeg/lib/avcodec.lib",
              "<@(libsdir)/ffmpeg/lib/avformat.lib",
              "<@(libsdir)/ffmpeg/lib/swresample.lib"
            ]
          },
           'copies': [{
            'destination': '<(PRODUCT_DIR)',
            'files': [
              "<@(libsdir)/portaudio/portaudio_x64.dll",
              "<@(libsdir)/libtensorflow/lib/tensorflow.dll",
              "<@(libsdir)/liquid-dsp/libliquid.dll",
              "<@(libsdir)/ffmpeg/lib/avutil-56.dll",
              "<@(libsdir)/ffmpeg/lib/avcodec-58.dll",
              "<@(libsdir)/ffmpeg/lib/avformat-58.dll",
              "<@(libsdir)/ffmpeg/lib/swresample-3.dll"
            ]
           }]
        }],
      	[ "OS==\"linux\"", {
          "cflags_cc": [ "-fno-rtti", "-std=c++1z", "-fpermissive"],
          "libraries": [
		        "-L<@(libsdir)/portaudio/lib/.libs -lportaudio -Wl,-rpath,./lib/portaudio/lib/.libs",
			      "<@(libsdir)/liquid-dsp/libliquid.a",
            "-L<@(libsdir)/ffmpeg-4.2.2/libavutil -lavutil -Wl,-rpath,./lib/ffmpeg-4.2.2/libavutil",
        		"-L<@(libsdir)/ffmpeg-4.2.2/libavcodec -lavcodec -Wl,-rpath,./lib/ffmpeg-4.2.2/libavcodec",
         		"-L<@(libsdir)/ffmpeg-4.2.2/libavformat -lavformat -Wl,-rpath,./lib/ffmpeg-4.2.2/libavformat",
        		"-L<@(libsdir)/ffmpeg-4.2.2/libswresample -lswresample -Wl,-rpath,./lib/ffmpeg-4.2.2/libswresample",
		        "-L<@(libsdir)/libtensorflow/lib -ltensorflow -Wl,-rpath,./lib/libtensorflow/lib"
		      ],
          "include_dirs": [
            "src/native",
            "<@(libsdir)/portaudio/include",
            "<@(libsdir)/libtensorflow/include",
            "<@(libsdir)/liquid-dsp/include",
            "<@(libsdir)/ffmpeg-4.2.2",
            "<!@(node -p \"require('node-addon-api').include\")"
          ],
        }],
        [ "OS==\"mac\"", {
          "xcode_settings": {
		        "OTHER_CFLAGS": [
		          "-std=c++17",
		          "-stdlib=libc++",
              "-Wno-return-type-c-linkage"
		        ],
		        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
		        "MACOSX_DEPLOYMENT_TARGET": "10.12",
            "OTHER_LDFLAGS": ["-w"]
		      },
		      "libraries": [
		        "<@(libsdir)/portaudio/lib/.libs/libportaudio.a",
            "<@(libsdir)/liquid-dsp/libliquid.ar",
            "<@(libsdir)/ffmpeg-4.2.2/libavutil/libavutil.a",
            "<@(libsdir)/ffmpeg-4.2.2/libavcodec/libavcodec.a",
            "<@(libsdir)/ffmpeg-4.2.2/libavformat/libavformat.a",
            "<@(libsdir)/ffmpeg-4.2.2/libswresample/libswresample.a",
		        "-L../lib/libtensorflow/lib -ltensorflow -Wl,-rpath,@loader_path/../../lib/libtensorflow/lib"
		      ],
          "include_dirs": [
            "src/native",
            "<@(libsdir)/portaudio/include",
            "<@(libsdir)/libtensorflow/include",
            "<@(libsdir)/liquid-dsp/include",
            "<@(libsdir)/ffmpeg-4.2.2",
            "<!@(node -p \"require('node-addon-api').include\")"
          ],
        }]
      ]
    }
  ]
}
