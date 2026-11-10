@echo off
REM Backward-compatible alias → Setup.bat
cd /d "%~dp0"
call "%~dp0Setup.bat" %*
