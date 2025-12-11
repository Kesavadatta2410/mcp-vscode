@echo off
REM Force cleanup and install for api-gateway
echo Killing Node processes...
taskkill /F /IM node.exe /T 2>nul

echo Waiting for file locks to release...
timeout /t 2 /nobreak >nul

echo Removing node_modules...
if exist node_modules (
    rmdir /s /q node_modules 2>nul
    if exist node_modules (
        echo Some files locked, trying alternative method...
        powershell -Command "Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue"
    )
)

echo Removing package-lock.json...
if exist package-lock.json del /f package-lock.json

echo Cleaning npm cache...
call npm cache clean --force

echo Installing dependencies (without optional)...
call npm install --omit=optional --legacy-peer-deps

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! Starting development server...
    echo ========================================
    echo.
    call npm run dev
) else (
    echo.
    echo ========================================
    echo INSTALL FAILED - See error above
    echo ========================================
    echo.
    echo Try running as Administrator or:
    echo 1. Close VS Code completely
    echo 2. Restart your computer
    echo 3. Run this script again
    pause
)
