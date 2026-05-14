@echo off
setlocal

set "HOST_NAME=com.aifilereader.host"
set "REG_KEY=HKCU\SOFTWARE\Google\Chrome\NativeMessagingHosts\%HOST_NAME%"

echo Unregistering native messaging host...
reg delete "%REG_KEY%" /f

if %errorlevel% equ 0 (
    echo Uninstall successful.
) else (
    echo Nothing to uninstall or operation failed.
)

pause
