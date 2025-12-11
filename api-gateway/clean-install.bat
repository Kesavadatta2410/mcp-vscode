@echo off
echo =========================================
echo Completely Clean API Gateway Install
echo =========================================
echo.

cd api-gateway

echo [1/5] Killing all Node processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo [2/5] Removing node_modules folder...
if exist node_modules (
    echo This may take a moment...
    rmdir /s /q node_modules 2>nul
    if exist node_modules (
        echo Retrying with PowerShell...
        powershell -Command "Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue"
        timeout /t 2 /nobreak >nul
    )
)

echo [3/5] Removing package-lock.json...
if exist package-lock.json del /f /q package-lock.json

echo [4/5] Clearing npm cache...
call npm cache clean --force

echo [5/5] Installing fresh dependencies...
call npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =========================================
    echo SUCCESS! API Gateway ready
    echo =========================================
    echo.
    echo Now run: npm run dev
    echo.
) else (
    echo.
    echo =========================================
    echo ERROR: Install failed
    echo =========================================
    echo.
    echo Try running as Administrator
    echo.
)

pause
