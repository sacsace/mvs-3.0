@echo off
setlocal
cd /d "%~dp0"
if exist "%LOCALAPPDATA%\MVS-Notifier\Uninstall.ps1" (
  powershell -NoProfile -ExecutionPolicy Bypass -STA -File "%LOCALAPPDATA%\MVS-Notifier\Uninstall.ps1" %*
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -STA -File "%~dp0Uninstall.ps1" %*
)
endlocal
