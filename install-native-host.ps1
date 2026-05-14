$ErrorActionPreference = 'Stop'

function Pause-Exit {
  param([int]$Code = 0)
  Write-Host ''
  Read-Host 'Press Enter to close'
  exit $Code
}

try {
  $rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  $nativeDir = Join-Path $rootDir 'native-host'
  $manifestPath = Join-Path $nativeDir 'manifest.json'
  $hostBatPath = Join-Path $nativeDir 'host.bat'
  $hostJsPath = Join-Path $nativeDir 'host.js'

  Write-Host ''
  Write-Host '========================================'
  Write-Host '  AI File Reader - Native Host Install'
  Write-Host '========================================'
  Write-Host ''
  Write-Host 'Before continuing:'
  Write-Host '  1. Open chrome://extensions'
  Write-Host '  2. Enable Developer mode'
  Write-Host '  3. Load this project folder as an unpacked extension'
  Write-Host '  4. Copy the extension ID'
  Write-Host ''

  $extensionId = Read-Host 'Paste extension ID'
  $extensionId = $extensionId.Trim().ToLowerInvariant()

  if ($extensionId -notmatch '^[a-p]{32}$') {
    Write-Host ''
    Write-Host 'Invalid extension ID. It should be 32 letters using a-p.' -ForegroundColor Red
    Pause-Exit 1
  }

  if (-not (Test-Path -LiteralPath $hostJsPath)) {
    Write-Host ''
    Write-Host "Cannot find native host file: $hostJsPath" -ForegroundColor Red
    Pause-Exit 1
  }

  Write-Host ''
  Write-Host '[1/3] Writing native host manifest...'

  $manifest = [ordered]@{
    name = 'com.aifilereader.host'
    description = 'AI File Reader native messaging host'
    path = $hostBatPath
    type = 'stdio'
    allowed_origins = @("chrome-extension://$extensionId/")
  }

  $json = $manifest | ConvertTo-Json -Depth 5
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($manifestPath, $json + [Environment]::NewLine, $utf8NoBom)

  Write-Host '[2/3] Registering in Windows registry...'

  $chromeKey = 'HKCU\SOFTWARE\Google\Chrome\NativeMessagingHosts\com.aifilereader.host'
  $edgeKey = 'HKCU\SOFTWARE\Microsoft\Edge\NativeMessagingHosts\com.aifilereader.host'

  & reg.exe add $chromeKey /ve /t REG_SZ /d $manifestPath /f | Out-Null
  & reg.exe add $edgeKey /ve /t REG_SZ /d $manifestPath /f | Out-Null

  Write-Host '[3/3] Checking Node.js...'

  $node = Get-Command node -ErrorAction SilentlyContinue
  if ($null -eq $node) {
    Write-Host ''
    Write-Host 'Warning: Node.js was not found in PATH.' -ForegroundColor Yellow
    Write-Host 'Install Node.js v14+ from https://nodejs.org, then restart Chrome.'
  } else {
    $nodeVersion = (& node -v)
    Write-Host "Node.js $nodeVersion is ready."
  }

  Write-Host ''
  Write-Host '========================================'
  Write-Host '  Install complete'
  Write-Host '========================================'
  Write-Host ''
  Write-Host 'Next steps:'
  Write-Host '  1. Restart Chrome'
  Write-Host '  2. Open a supported AI website'
  Write-Host '  3. Click the file button or press Ctrl+Shift+F'

  Pause-Exit 0
} catch {
  Write-Host ''
  Write-Host ('Install failed: ' + $_.Exception.Message) -ForegroundColor Red
  Pause-Exit 1
}
