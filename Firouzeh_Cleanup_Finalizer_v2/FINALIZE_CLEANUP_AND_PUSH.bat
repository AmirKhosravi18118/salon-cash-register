@echo off
setlocal EnableExtensions
chcp 65001 >nul
title Firouzeh - Finalize Project Cleanup

echo ============================================================
echo   Firouzeh - Finalize Project Cleanup v2
echo ============================================================
echo.

set "TOOL_DIR=%~dp0"
for %%I in ("%TOOL_DIR%..") do set "PARENT_DIR=%%~fI"

set "PROJECT_DIR="
if exist "%PARENT_DIR%\package.json" set "PROJECT_DIR=%PARENT_DIR%"
if not defined PROJECT_DIR if exist "D:\salon-cash-register\package.json" set "PROJECT_DIR=D:\salon-cash-register"

if not defined PROJECT_DIR (
  echo [ERROR] Project root was not found.
  echo.
  echo Put the complete Firouzeh_Cleanup_Finalizer_v2 folder inside:
  echo D:\salon-cash-register
  echo.
  pause
  exit /b 1
)

cd /d "%PROJECT_DIR%"

echo Project:
echo %PROJECT_DIR%
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Git was not found in PATH.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [ERROR] This folder is not a Git repository.
  pause
  exit /b 1
)

echo [1/5] Finalizing .gitignore without PowerShell...

if not exist ".gitignore" type nul > ".gitignore"

call :EnsureIgnore "node_modules/"
call :EnsureIgnore "dist/"
call :EnsureIgnore ".update-backups/"
call :EnsureIgnore "Firouzeh_*Update*/"
call :EnsureIgnore "Firouzeh_Update_*/"
call :EnsureIgnore "Firouzeh_Kasse_Update_*/"
call :EnsureIgnore "Firouzeh_Final_Update_*/"
call :EnsureIgnore "Firouzeh_Source_Sync*/"
call :EnsureIgnore "Firouzeh_Project_Cleanup*/"
call :EnsureIgnore "Firouzeh_Cleanup_Finalizer*/"
call :EnsureIgnore "PROJECT_FILES.txt"
call :EnsureIgnore "*.zip"
call :EnsureIgnore "UPDATE_*.txt"
call :EnsureIgnore "SYNC_*.txt"
call :EnsureIgnore "CLEANUP_*.txt"
call :EnsureIgnore ".env"
call :EnsureIgnore ".env.local"
call :EnsureIgnore ".env.*.local"
call :EnsureIgnore "*.log"

echo [OK] .gitignore finalized.

echo.
echo [2/5] Removing generated files from Git index when tracked...
git rm -r --cached --ignore-unmatch dist node_modules .update-backups >nul 2>&1
git rm --cached --ignore-unmatch PROJECT_FILES.txt >nul 2>&1
echo [OK] Git index cleanup completed.

echo.
echo [3/5] Staging cleanup changes...
git add -A
if errorlevel 1 (
  echo [ERROR] git add failed.
  pause
  exit /b 1
)
echo [OK] Changes staged.

echo.
echo [4/5] Creating cleanup commit when needed...
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "chore: finalize project cleanup"
  if errorlevel 1 (
    echo [ERROR] Git commit failed.
    pause
    exit /b 1
  )
  echo [OK] Cleanup commit created.
) else (
  echo [OK] No additional commit was required.
)

echo.
echo [5/5] Pushing current source to origin/main...
git push origin HEAD:main
if errorlevel 1 (
  echo.
  echo [ERROR] Git push failed.
  echo If GitHub opens an authentication window, approve it and run this file once more.
  pause
  exit /b 1
)

for /f %%H in ('git rev-parse HEAD') do set "LOCAL_HASH=%%H"
for /f %%H in ('git ls-remote origin refs/heads/main ^| findstr /R "^[0-9a-f]"') do set "REMOTE_LINE=%%H"
for /f "tokens=1" %%H in ("%REMOTE_LINE%") do set "REMOTE_HASH=%%H"

if not defined REMOTE_HASH (
  echo [ERROR] Remote main commit could not be verified.
  pause
  exit /b 1
)

if /I not "%LOCAL_HASH%"=="%REMOTE_HASH%" (
  echo [ERROR] Local and remote commit hashes do not match.
  echo Local:  %LOCAL_HASH%
  echo Remote: %REMOTE_HASH%
  pause
  exit /b 1
)

(
  echo SUCCESS
  echo Project=%PROJECT_DIR%
  echo Commit=%LOCAL_HASH%
  echo Backup=D:\Firouzeh_Final_Source_Backup_20260827-231412.zip
  echo Date=%DATE% %TIME%
) > "%TOOL_DIR%CLEANUP_FINALIZED.txt"

echo.
echo ============================================================
echo [SUCCESS] Cleanup was finalized and pushed successfully.
echo.
echo Source files are intact.
echo The previous backup remains at:
echo D:\Firouzeh_Final_Source_Backup_20260827-231412.zip
echo.
echo Commit:
echo %LOCAL_HASH%
echo.
echo Report:
echo %TOOL_DIR%CLEANUP_FINALIZED.txt
echo ============================================================
echo.
pause
exit /b 0

:EnsureIgnore
set "IGNORE_RULE=%~1"
findstr /L /X /C:"%IGNORE_RULE%" ".gitignore" >nul 2>&1
if errorlevel 1 (
  >> ".gitignore" echo %IGNORE_RULE%
)
exit /b 0
