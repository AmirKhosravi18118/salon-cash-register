@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Salon Kasse - Definitive Fix, Build and Start

echo ============================================================
echo     Salon Kasse - Definitive Fix, Build and Start
echo ============================================================
echo.

cd /d "%~dp0"
if not exist "package.json" (
  if exist "..\package.json" cd /d ".."
)

if not exist "package.json" (
  echo [ERROR] package.json was not found.
  echo Put this file and final-repair.mjs inside the scripts folder.
  echo.
  pause
  exit /b 1
)

echo [OK] Project folder:
echo %CD%
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%V in ('node -p "process.versions.node"') do set NODE_MAJOR=%%V
if %NODE_MAJOR% LSS 24 (
  echo [ERROR] Node.js 24 or newer is required.
  echo Installed:
  node --version
  pause
  exit /b 1
)

echo [OK] Node.js:
call node --version
echo [OK] npm:
call npm --version
echo.

if not exist "node_modules\lucide-react\package.json" (
  echo [1/7] Dependencies are missing. Installing them...
  call npm install --include=optional
  if errorlevel 1 goto :install_error
) else (
  echo [1/7] Dependencies are already installed.
)

echo.
echo [2/7] Repairing source imports and validating all Lucide icons...
call node "scripts\final-repair.mjs"
if errorlevel 1 goto :repair_error

echo.
echo [3/7] Running TypeScript validation...
call npm run typecheck
if errorlevel 1 goto :typecheck_error

echo.
echo [4/7] Creating a clean production build...
if exist "dist" rmdir /s /q "dist"
call npm run build
if errorlevel 1 goto :build_error

if not exist "dist\index.html" (
  echo [ERROR] Build ended without creating dist\index.html.
  pause
  exit /b 1
)

echo.
echo [5/7] Production build verified:
for %%F in ("dist\index.html") do echo [OK] %%~fF
echo.
echo [6/7] Releasing port 5173 if it is already occupied...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":5173 .*LISTENING"') do (
  taskkill /PID %%P /F >nul 2>&1
)

echo.
echo [7/7] Starting Salon Kasse...
echo ============================================================
echo [SUCCESS] Source validation, TypeScript and production build passed.
echo.
echo Application:
echo http://127.0.0.1:5173
echo.
echo Keep this window open while using the local application.
echo Press Ctrl+C to stop it.
echo ============================================================
echo.

call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort --open
set APP_EXIT=%ERRORLEVEL%
echo.
echo The local server stopped with exit code: %APP_EXIT%
pause
exit /b %APP_EXIT%

:install_error
echo.
echo [ERROR] npm install failed.
echo Send the final lines displayed above.
pause
exit /b 1

:repair_error
echo.
echo [ERROR] Automated source validation failed.
echo Send the final lines displayed above.
pause
exit /b 1

:typecheck_error
echo.
echo [ERROR] TypeScript validation failed.
echo Send the exact TypeScript lines displayed above.
pause
exit /b 1

:build_error
echo.
echo [ERROR] Production build failed.
echo Send the exact build lines displayed above.
pause
exit /b 1
