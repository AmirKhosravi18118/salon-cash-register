@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Firouzeh Hair and Beauty - Local App

cd /d "%~dp0"
if not exist "package.json" (
  if exist "..\package.json" cd /d ".."
)

if not exist "package.json" (
  echo [ERROR] package.json was not found.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  pause
  exit /b 1
)

if not exist "node_modules\vite\package.json" (
  echo Installing dependencies...
  call npm install --include=optional
  if errorlevel 1 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
  )
)

for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":5173 .*LISTENING"') do (
  taskkill /PID %%P /F >nul 2>&1
)

echo ============================================================
echo Firouzeh Hair and Beauty - Salon Kasse v0.5.0-test
echo http://127.0.0.1:5173
echo Keep this window open while using the local application.
echo ============================================================
echo.

call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort --open
set "APP_EXIT=%ERRORLEVEL%"
echo.
echo The local server stopped with exit code: %APP_EXIT%
pause
exit /b %APP_EXIT%
