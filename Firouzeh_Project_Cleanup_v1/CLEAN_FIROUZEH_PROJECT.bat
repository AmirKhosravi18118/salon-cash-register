@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Firouzeh - Safe Project Cleanup

for %%I in ("%~dp0..") do set "PARENT_DIR=%%~fI"
if exist "%~dp0package.json" (
  set "PROJECT_DIR=%~dp0"
) else if exist "%PARENT_DIR%\package.json" (
  set "PROJECT_DIR=%PARENT_DIR%"
) else if exist "D:\salon-cash-register\package.json" (
  set "PROJECT_DIR=D:\salon-cash-register"
) else (
  echo [ERROR] Project folder was not found.
  echo Put this cleanup folder inside D:\salon-cash-register and run again.
  pause
  exit /b 1
)

echo ============================================================
echo   Firouzeh - Safe Project Cleanup
echo ============================================================
echo.
echo Project:
echo %PROJECT_DIR%
echo.
echo This tool will create a source backup and then remove only:
echo - old Firouzeh update/sync folders
echo - .update-backups
echo - dist
echo - PROJECT_FILES.txt
echo.
echo Source files, public, scripts, node_modules and Docker files stay intact.
echo.
choice /C YN /N /M "Continue? [Y/N]: "
if errorlevel 2 exit /b 0

powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0cleanup-project.ps1" -ProjectRoot "%PROJECT_DIR%"
if errorlevel 1 (
  echo.
  echo [ERROR] Cleanup did not finish.
  echo See:
  echo %~dp0CLEANUP_ERROR.txt
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================================
echo [SUCCESS] Project cleanup completed.
echo ============================================================
echo.
pause
