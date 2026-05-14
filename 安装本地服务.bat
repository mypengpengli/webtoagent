@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%install-native-host.ps1"

if errorlevel 1 (
  echo.
  echo Installation failed. See the message above.
  echo.
  pause
)
