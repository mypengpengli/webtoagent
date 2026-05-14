@echo off
chcp 65001 >nul

echo.
echo  正在卸载 AI File Reader 本地服务...

reg delete "HKCU\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.aifilereader.host" /f >nul 2>&1
reg delete "HKCU\SOFTWARE\Microsoft\Edge\NativeMessagingHosts\com.aifilereader.host" /f >nul 2>&1

echo.
echo  已卸载。重启浏览器后生效。
echo.

pause
