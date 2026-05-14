@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo  ========================================
echo    AI File Reader - 一键安装本地服务
echo  ========================================
echo.
echo  请先在 Chrome 中加载本扩展：
echo    1. 打开 chrome://extensions
echo    2. 开启「开发者模式」
echo    3. 点击「加载已解压的扩展程序」选择本文件夹
echo    4. 复制扩展卡片上的 ID（一串字母）
echo.
echo  ----------------------------------------
echo.

set /p EXT_ID="请粘贴你的扩展 ID: "

if "%EXT_ID%"=="" (
    echo.
    echo  错误：扩展 ID 不能为空！
    pause
    exit /b 1
)

echo.
echo  [1/3] 写入扩展 ID...

set "NATIVE_DIR=%~dp0native-host"
set "MANIFEST=%NATIVE_DIR%\manifest.json"
set "BAT_PATH=%NATIVE_DIR%\host.bat"

:: Write native host manifest with correct extension ID and path
echo {> "%MANIFEST%"
echo   "name": "com.aifilereader.host",>> "%MANIFEST%"
echo   "description": "AI File Reader native messaging host",>> "%MANIFEST%"
echo   "path": "%BAT_PATH:\=\\%",>> "%MANIFEST%"
echo   "type": "stdio",>> "%MANIFEST%"
echo   "allowed_origins": [>> "%MANIFEST%"
echo     "chrome-extension://%EXT_ID%/">> "%MANIFEST%"
echo   ]>> "%MANIFEST%"
echo }>> "%MANIFEST%"

echo  [2/3] 注册到 Windows...

set "REG_KEY=HKCU\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.aifilereader.host"
reg add "%REG_KEY%" /ve /t REG_SZ /d "%MANIFEST%" /f >nul 2>&1

if %errorlevel% neq 0 (
    echo.
    echo  注册失败，请尝试右键「以管理员身份运行」
    pause
    exit /b 1
)

:: Also register for Edge
set "EDGE_KEY=HKCU\SOFTWARE\Microsoft\Edge\NativeMessagingHosts\com.aifilereader.host"
reg add "%EDGE_KEY%" /ve /t REG_SZ /d "%MANIFEST%" /f >nul 2>&1

echo  [3/3] 检查 Node.js...

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  警告：未检测到 Node.js！
    echo  请安装 Node.js v14+ 后重启 Chrome
    echo  下载地址：https://nodejs.org
    echo.
) else (
    for /f "tokens=*" %%v in ('node -v') do echo  Node.js %%v 已就绪
)

echo.
echo  ========================================
echo    安装完成！
echo  ========================================
echo.
echo  接下来：
echo    1. 重启 Chrome
echo    2. 点击扩展图标，设置你的项目目录
echo    3. 打开 AI 网站，享受文件读取功能
echo.

pause
