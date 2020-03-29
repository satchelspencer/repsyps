{
  "targets": [
    {
      "target_name": "audio",
      "sources": [
        "src/native/addon.cc",
        "src/native/audio.cc",
        "src/native/callback.cc",
        "src/native/filter.cc",
        "src/native/separate.cc",
        "src/native/load.cc",
        "src/native/export.cc",
        "src/native/impdet.cc",
        "src/native/waveform.cc"
      ],
      "include_dirs": [
        "src/native",
        "<@(libsdir)/portaudio/include",
        "<@(libsdir)/libtensorflow/include",
        "<@(libsdir)/liquid-dsp/include",
         "<@(libsdir)/ffmpeg-4.2.2",
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ],
      "conditions": [
      	[ "OS==\"linux\"", {
          "cflags_cc": [ "-fno-rtti", "-std=c++1z", "-fpermissive"],
          "libraries": [
		        "-lportaudio",
		        "-L../lib/libtensorflow/lib -ltensorflow -Wl,-rpath,./lib/libtensorflow/lib"
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
        }]
      ]
    }
  ]
}
