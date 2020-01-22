{
  "targets": [
    {
      "target_name": "audio",
      "cflags!": [ "-std=c++17" ],
      "cflags_cc!": [ "-fno-rtti"],
      "ldflags" : ["-Wl,-rpath,../lib"],
      "sources": [
        "src/native/addon.cc",
        "src/native/audio.cc",
        "src/native/callback.cc"
      ],
      "include_dirs": [
        "src/native",
        "<@(libsdir)/portaudio/include",
        "<@(libsdir)/kfr/include",
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "libraries": [
        "<@(libsdir)/portaudio/lib/.libs/libportaudio.a",
        "<@(libsdir)/kfr/build/lib/libkfr_capi_avx_pic.a"
      ],
      'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ],
      "xcode_settings": {
        "OTHER_CFLAGS": [
          "-std=c++17",
          "-stdlib=libc++"
        ],
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "MACOSX_DEPLOYMENT_TARGET": "10.9"
      },
    }
  ]
}