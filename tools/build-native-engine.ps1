$ErrorActionPreference='Stop'
$repo=Split-Path $PSScriptRoot -Parent
$toolsRoot='C:\Dev\JULIE\native-engine-tools'
$build="$toolsRoot\build-android-arm64"
$ndk="$toolsRoot\android-ndk-r30"
$cmake="$toolsRoot\cmake-4.4.4-windows-x86_64\bin\cmake.exe"
$revision=git -C "$toolsRoot\llama.cpp" rev-parse HEAD
if($revision -ne 'f2cc7282ce0042641df55e0e563b75e824e2b647'){throw 'Unexpected llama.cpp revision'}
& $cmake -S "$toolsRoot\llama.cpp" -B $build -G Ninja "-DCMAKE_MAKE_PROGRAM=$toolsRoot\ninja\ninja.exe" "-DCMAKE_TOOLCHAIN_FILE=$ndk\build\cmake\android.toolchain.cmake" -DANDROID_ABI=arm64-v8a -DANDROID_PLATFORM=android-28 -DCMAKE_BUILD_TYPE=Release -DGGML_NATIVE=OFF -DGGML_OPENMP=OFF -DGGML_LLAMAFILE=OFF -DLLAMA_OPENSSL=OFF -DLLAMA_BUILD_TESTS=OFF -DLLAMA_BUILD_SERVER=OFF -DLLAMA_BUILD_APP=OFF -DLLAMA_BUILD_TOOLS=OFF -DLLAMA_BUILD_EXAMPLES=ON
if($LASTEXITCODE -ne 0){throw 'CMake configuration failed'}
& $cmake --build $build --target llama-simple -j 1
if($LASTEXITCODE -ne 0){throw 'Native build failed'}
& "$ndk\toolchains\llvm\prebuilt\windows-x86_64\bin\clang++.exe" --target=aarch64-linux-android28 -shared -fPIC -std=c++17 -O2 "-I$toolsRoot\llama.cpp\include" "-I$toolsRoot\llama.cpp\ggml\include" "$repo\julie-v3-genesis\android\julie_engine.cpp" "-L$build\bin" -lllama -lggml -lggml-base -o "$build\bin\libjulie_engine.so"
if($LASTEXITCODE -ne 0){throw 'JNI build failed'}
Write-Output 'Native engine ready. Stage shared libraries and libc++_shared.so in TEST APK jniLibs/arm64-v8a.'
