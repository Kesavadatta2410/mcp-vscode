@echo off
REM Cross-platform MCP Server Launcher for Windows
REM This script starts the local MCP servers

setlocal enabledelayedexpansion

echo ===============================
echo   MCP-VSCode Local Server
echo ===============================
echo.

REM Get project directory
set PROJECT_DIR=%CD%

REM Load environment variables if .env exists
if exist .env (
    echo Loading environment variables from .env...
    for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
        set %%a=%%b
    )
)

REM Set defaults if not configured
if not defined PROJECT_PATH set PROJECT_PATH=%CD%
if not defined ALLOWED_DIRECTORIES set ALLOWED_DIRECTORIES=%CD%
if not defined GIT_REPO_PATH set GIT_REPO_PATH=%CD%

echo.
echo Configuration:
echo   PROJECT_PATH=%PROJECT_PATH%
echo   ALLOWED_DIRECTORIES=%ALLOWED_DIRECTORIES%
echo   GIT_REPO_PATH=%GIT_REPO_PATH%

REM Check for GITHUB_TOKEN
if defined GITHUB_TOKEN (
    echo   GITHUB_TOKEN=configured
) else (
    echo   GITHUB_TOKEN=not set (GitHub features will not work)
)

echo.
echo Available MCP servers:
echo   [1] Repo MCP Server (file operations)
echo   [2] Git MCP Server (git operations)
echo   [3] GitHub MCP Server (GitHub API)
echo   [4] VSCode MCP Server (diagnostics bridge)
echo   [A] All servers

set /p choice="Select server to start (1-4 or A): "

if /i "%choice%"=="1" goto :start_repo
if /i "%choice%"=="2" goto :start_git
if /i "%choice%"=="3" goto :start_github
if /i "%choice%"=="4" goto :start_vscode
if /i "%choice%"=="A" goto :start_all

echo Invalid choice
exit /b 1

:start_repo
echo.
echo Starting Repo MCP Server...
cd servers\repo-mcp-server
set ALLOWED_DIRECTORIES=%ALLOWED_DIRECTORIES%
node dist\index.js
goto :end

:start_git
echo.
echo Starting Git MCP Server...
cd servers\git-mcp-server
set GIT_REPO_PATH=%GIT_REPO_PATH%
set PROJECT_PATH=%PROJECT_PATH%
node dist\index.js
goto :end

:start_github
echo.
echo Starting GitHub MCP Server...
if not defined GITHUB_TOKEN (
    echo ERROR: GITHUB_TOKEN environment variable must be set
    echo Generate a token at: https://github.com/settings/tokens
    exit /b 1
)
cd servers\github-mcp-server
set GITHUB_TOKEN=%GITHUB_TOKEN%
node dist\index.js
goto :end

:start_vscode
echo.
echo Starting VSCode MCP Server...
if not defined VSCODE_SERVICE_URL set VSCODE_SERVICE_URL=http://localhost:5007
cd servers\vscode-mcp-server
set VSCODE_SERVICE_URL=%VSCODE_SERVICE_URL%
node dist\index.js
goto :end

:start_all
echo.
echo Starting all MCP servers is not supported via this script.
echo Use MCP client configuration to run multiple servers.
exit /b 1

:end
endlocal
