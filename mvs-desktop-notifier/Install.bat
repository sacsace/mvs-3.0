@echo off
setlocal
set "DEST=%LOCALAPPDATA%\MVS-Notifier"
set "SRC=%~dp0"

if not exist "%DEST%" mkdir "%DEST%"
copy /Y "%SRC%MVS-Notifier.ps1" "%DEST%\MVS-Notifier.ps1" >nul
copy /Y "%SRC%Start-MVS-Notifier.bat" "%DEST%\Start-MVS-Notifier.bat" >nul
copy /Y "%SRC%README.txt" "%DEST%\README.txt" >nul
copy /Y "%SRC%mvs-notifier.ico" "%DEST%\mvs-notifier.ico" >nul

REM Clear cached token so next start forces re-login with notifier client flag
if exist "%DEST%\config.json" del /F /Q "%DEST%\config.json" >nul 2>&1

set "STARTMENU=%APPDATA%\Microsoft\Windows\Start Menu\Programs\MVS Notifier.lnk"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws=New-Object -ComObject WScript.Shell; $s=$ws.CreateShortcut('%STARTMENU%'); $s.TargetPath='%DEST%\Start-MVS-Notifier.bat'; $s.WorkingDirectory='%DEST%'; $s.IconLocation='%DEST%\mvs-notifier.ico,0'; $s.WindowStyle=7; $s.Save()"

echo Installed to: %DEST%
echo Start Menu shortcut created: MVS Notifier
echo Cached login cleared — please sign in again in the tray app.
echo Startup on login is NOT enabled.
echo.
pause

start "" "%DEST%\Start-MVS-Notifier.bat"
endlocal
