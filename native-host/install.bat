@echo off
setlocal

set "HOST_NAME=com.aifilereader.host"
set "SCRIPT_DIR=%~dp0"
set "MANIFEST_PATH=%SCRIPT_DIR%manifest.json"
set "BAT_PATH=%SCRIPT_DIR%host.bat"
set "REG_KEY=HKCU\SOFTWARE\Google\Chrome\NativeMessagingHosts\%HOST_NAME%"

echo ============================================
echo   AI File Reader - Native Host Installer
echo ============================================
echo.

:: Update manifest.json with correct path
echo Updating manifest with correct paths...
powershell -Command "(Get-Content '%MANIFEST_PATH%') -replace '\"path\": \".*\"', '\"path\": \"%BAT_PATH:\=\\%\"' | Set-Content '%MANIFEST_PATH%'"

:: Register in Windows Registry
echo Registering native messaging host...
reg add "%REG_KEY%" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f

if %errorlevel% equ 0 (
    echo.
    echo Installation successful!
    echo.
    echo IMPORTANT: You need to update the extension ID in manifest.json
    echo 1. Load the extension in Chrome (chrome://extensions, Developer mode)
    echo 2. Copy the extension ID
    echo 3. Edit "%MANIFEST_PATH%"
    echo 4. Replace YOUR_EXTENSION_ID_HERE with your actual extension ID
    echo.
) else (
    echo.
    echo Installation failed. Please run as administrator.
)

pause
