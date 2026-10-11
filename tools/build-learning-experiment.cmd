@echo off
setlocal
set "JAVA_HOME=C:\Users\amaur\.jdks\jbr-21.0.11"
set "JULIE_BUILD=C:\Dev\JULIE\learning-build-20261011"
robocopy "C:\Dev\JULIE\JULIE-build-test-20261011-195325\android" "%JULIE_BUILD%\android" /E /XD build .gradle /NFL /NDL /NJH /NJS
if errorlevel 8 exit /b 1
copy /Y "C:\Dev\JULIE\learning-integration-20261011\julie-v3-genesis\www\app.js" "%JULIE_BUILD%\android\app\src\main\assets\julie\app.js" >nul
if errorlevel 1 exit /b 1
copy /Y "C:\Dev\JULIE\learning-integration-20261011\julie-v3-genesis\www\index.html" "%JULIE_BUILD%\android\app\src\main\assets\julie\index.html" >nul
if errorlevel 1 exit /b 1
cd /d "%JULIE_BUILD%\android"
call "C:\Users\amaur\.gradle\wrapper\dists\gradle-8.9-bin\90cnw93cvbtalezasaz0blq0a\gradle-8.9\bin\gradle.bat" --offline --no-daemon --max-workers=1 "-Dorg.gradle.jvmargs=-Xmx1024m -Dfile.encoding=UTF-8" assembleDebug > "%JULIE_BUILD%\build.log" 2>&1
exit /b %errorlevel%
