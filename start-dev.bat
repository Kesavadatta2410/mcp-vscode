@echo off
echo ========================================
echo Starting MCP VS Code Web Application
echo ========================================
echo.

REM Check if servers are built
if not exist "servers\repo-mcp-server\dist\index.js" (
    echo ERROR: MCP servers not built!
    echo Please run: build-all-servers.bat
    pause
    exit /b 1
)

echo Starting Backend...
start "MCP Backend" cmd /k "cd api-gateway && npm run dev"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Frontend...
start "MCP Frontend" cmd /k "cd web-frontend && npm run dev"

echo.
echo ========================================
echo Both servers starting in new windows
echo ========================================
echo.
echo Backend: http://localhost:4000
echo Frontend: http://localhost:3000
echo.
echo Wait 10-15 seconds then open:
echo   http://localhost:3000
echo.
echo Press any key to exit this window...
pause >nul
