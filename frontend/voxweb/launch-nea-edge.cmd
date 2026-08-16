@echo off
setlocal
set "NEA_URL=http://111.230.201.92/?force=1"
set "NEA_ORIGIN=http://111.230.201.92"
set "NEA_PROFILE=%LOCALAPPDATA%\NEA-Edge-Test-Profile"
set "EDGE_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"

if not exist "%EDGE_EXE%" set "EDGE_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE_EXE%" (
  echo Microsoft Edge was not found.
  echo Install Edge or update EDGE_EXE in this file.
  pause
  exit /b 1
)

start "NEA WebGPU" "%EDGE_EXE%" --user-data-dir="%NEA_PROFILE%" --unsafely-treat-insecure-origin-as-secure="%NEA_ORIGIN%" "%NEA_URL%"
endlocal
