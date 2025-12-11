@echo off
REM Build all MCP servers
echo ========================================
echo Building All MCP Servers
echo ========================================
echo.

cd ..

echo [1/5] Building repo-mcp-server...
cd servers\repo-mcp-server
call npm install
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: repo-mcp-server build failed
    pause
    exit /b 1
)

echo [2/5] Building git-mcp-server...
cd ..\git-mcp-server
call npm install
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: git-mcp-server build failed
    pause
    exit /b 1
)

echo [3/5] Building exec-mcp-server...
cd ..\exec-mcp-server
call npm install
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: exec-mcp-server build failed
    pause
    exit /b 1
)

echo [4/5] Building vscode-mcp-server...
cd ..\vscode-mcp-server
call npm install
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: vscode-mcp-server build failed
    pause
    exit /b 1
)

echo [5/5] Building github-mcp-server...
cd ..\github-mcp-server
call npm install
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: github-mcp-server build failed
    pause
    exit /b 1
)

cd ..\..

echo.
echo ========================================
echo SUCCESS! All MCP servers built
echo ========================================
echo.
echo You can now start the API gateway:
echo   cd api-gateway
echo   npm run dev
echo.
pause
