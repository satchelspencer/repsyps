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
      ],
      "include_dirs": [
        "src/native",
        "<@(libsdir)/portaudio/include",
        "<@(libsdir)/libtensorflow/include",
        "<@(libsdir)/liquid-dsp/include",
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      'defines': [ 'NAPI_DISABLE_CPP_EXCEPTIONS' ],
      "conditions": [
      	[ "OS==\"linux\"", {
          "cflags_cc": [ "-fno-rtti", "-std=c++1z", "-fpermissive"],
          "libraries": [
		        "-lportaudio",
		        "-L../lib/libtensorflow/lib -ltensorflow -Wl,-rpath,./lib/libtensorflow/lib",
		      ],
        }],
        [ "OS==\"mac\"", {
          "xcode_settings": {
		        "OTHER_CFLAGS": [
		          "-std=c++17",
		          "-stdlib=libc++"
		        ],
		        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
		        "MACOSX_DEPLOYMENT_TARGET": "10.12"
		      },
		      "libraries": [
		        "<@(libsdir)/portaudio/lib/.libs/libportaudio.a",
            "<@(libsdir)/liquid-dsp/libliquid.ar",
		        "-L../lib/libtensorflow/lib -ltensorflow -Wl,-rpath,@loader_path/../../lib/libtensorflow/lib",
		      ],
        }]
      ]
    }
  ]
}
