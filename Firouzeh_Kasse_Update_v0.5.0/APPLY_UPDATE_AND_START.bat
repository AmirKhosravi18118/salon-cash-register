@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Firouzeh Hair and Beauty - Update v0.5.0

echo ============================================================
echo   Firouzeh Hair and Beauty - Apply Update v0.5.0-test
echo ============================================================
echo.

for %%I in ("%~dp0..") do set "PROJECT_DIR=%%~fI"

if not exist "%PROJECT_DIR%\package.json" (
  echo [ERROR] Project root was not found.
  echo.
  echo Extract this complete update folder directly inside:
  echo D:\salon-cash-register
  echo.
  pause
  exit /b 1
)

echo Project:
echo %PROJECT_DIR%
echo.

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0apply-update.ps1"
if errorlevel 1 goto :update_error

cd /d "%PROJECT_DIR%"

echo.
echo Releasing port 5173 if it is already occupied...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":5173 .*LISTENING"') do (
  taskkill /PID %%P /F >nul 2>&1
)

echo.
echo ============================================================
echo [SUCCESS] Firouzeh Kasse v0.5.0-test is ready.
echo.
echo Application:
echo http://127.0.0.1:5173
echo.
echo Keep this window open while testing the application.
echo Press Ctrl+C to stop it.
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
echo [ERROR] The update was not installed.
echo The previous source files were restored automatically.
echo.
echo Open this file and send its contents if needed:
echo %~dp0UPDATE_ERROR.txt
echo ============================================================
echo.
pause
exit /b 1
