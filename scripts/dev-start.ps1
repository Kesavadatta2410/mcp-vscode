# Development Startup Script (PowerShell)
# Starts Docker container and MCP servers for development
# Run from project root: .\scripts\dev-start.ps1

param(
    [string]$ProjectPath = (Get-Location),
    [switch]$NoBuild,
    [switch]$NoDocker
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " MCP VSCode Development Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $PSScriptRoot

# Build if needed
if (-not $NoBuild) {
    Write-Host "`nBuilding packages..." -ForegroundColor Yellow
    & "$rootDir\scripts\build-all.ps1"
}

# Set environment variables
$env:PROJECT_PATH = $ProjectPath
$env:ALLOWED_DIRECTORIES = $ProjectPath
$env:VSCODE_SERVICE_URL = "http://localhost:5007"

Write-Host "`nConfiguration:" -ForegroundColor Yellow
Write-Host "  PROJECT_PATH: $env:PROJECT_PATH"
Write-Host "  ALLOWED_DIRECTORIES: $env:ALLOWED_DIRECTORIES"
Write-Host "  VSCODE_SERVICE_URL: $env:VSCODE_SERVICE_URL"

# Start Docker container
if (-not $NoDocker) {
    Write-Host "`nStarting Docker container..." -ForegroundColor Yellow
    Set-Location "$rootDir\vscode-headless"
    docker-compose up -d --build
    
    Write-Host "Waiting for services to start..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
    
    # Check health
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:5007/health" -Method Get
        Write-Host "Diagnostics service is healthy: $($health.status)" -ForegroundColor Green
    } catch {
        Write-Host "Warning: Diagnostics service not responding yet" -ForegroundColor Yellow
    }
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " Environment Ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Services Running:" -ForegroundColor Cyan
Write-Host "  - VS Code Web: http://localhost:3000"
Write-Host "  - Diagnostics API: http://localhost:5007"
Write-Host ""
Write-Host "To start MCP servers, run these commands in separate terminals:"
Write-Host ""
Write-Host "  # Repo MCP Server (file operations)" -ForegroundColor Yellow
Write-Host "  node $rootDir\servers\repo-mcp-server\dist\index.js"
Write-Host ""
Write-Host "  # VSCode MCP Server (diagnostics)" -ForegroundColor Yellow
Write-Host "  node $rootDir\servers\vscode-mcp-server\dist\index.js"
Write-Host ""
Write-Host "Or configure them in your MCP client config (see config/mcp-config.example.json)"
Write-Host ""

Set-Location $rootDir
