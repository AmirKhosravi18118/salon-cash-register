@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Firouzeh - Update v0.6.0

echo ============================================================
echo   Firouzeh - Apply Update v0.6.0-test
echo ============================================================
echo.

for %%I in ("%~dp0..") do set "PROJECT_DIR=%%~fI"

if not exist "%PROJECT_DIR%\package.json" (
  echo [ERROR] Project root was not found.
  echo.
  echo Put this complete update folder inside:
  echo D:\salon-cash-register
  echo.
  pause
  exit /b 1
)

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply-update.ps1"
if errorlevel 1 goto :update_error

cd /d "%PROJECT_DIR%"

echo.
echo Releasing port 5173 if needed...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":5173 .*LISTENING"') do (
  taskkill /PID %%P /F >nul 2>&1
)

echo.
echo ============================================================
echo [SUCCESS] Firouzeh v0.6.0-test is ready.
echo.
echo http://127.0.0.1:5173
echo.
echo Keep this window open while testing.
echo Press Ctrl+C to stop.
echo ============================================================
echo.

call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort --open
set "APP_EXIT=%ERRORLEVEL%"
echo.
echo The local server stopped with exit code: %APP_EXIT%
pause
exit /b %APP_EXIT%

:update_error
echo.
echo ============================================================
echo [ERROR] Update was not installed.
echo Previous source files were restored automatically.
echo.
echo Error report:
echo %~dp0UPDATE_ERROR.txt
echo ============================================================
echo.
pause
exit /b 1
