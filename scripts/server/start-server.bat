@echo off
REM MVS 서버 시작 배치 파일 (Windows)
REM PowerShell 스크립트를 실행합니다

chcp 65001 >nul
echo.
echo 🚀 MVS 서버 시작
echo ====================================
echo.

REM PowerShell 스크립트 실행
powershell.exe -ExecutionPolicy Bypass -File "%~dp0start-server.ps1" %*

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ 서버 시작 중 오류가 발생했습니다.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ✅ 서버 시작 완료!
echo.
pause

