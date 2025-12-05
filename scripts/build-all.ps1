# Build All Packages Script (PowerShell)
# Run from the project root: .\scripts\build-all.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Building MCP VSCode Project" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $PSScriptRoot

# Install root dependencies
Write-Host "`n[1/4] Installing root dependencies..." -ForegroundColor Yellow
Set-Location $rootDir
npm install

# Build Repo MCP Server
Write-Host "`n[2/4] Building Repo MCP Server..." -ForegroundColor Yellow
Set-Location "$rootDir\servers\repo-mcp-server"
npm install
npm run build

# Build VSCode MCP Server
Write-Host "`n[3/4] Building VSCode MCP Server..." -ForegroundColor Yellow
Set-Location "$rootDir\servers\vscode-mcp-server"
npm install
npm run build

# Build Diagnostics Service
Write-Host "`n[4/4] Building Diagnostics Service..." -ForegroundColor Yellow
Set-Location "$rootDir\vscode-headless\diagnostics-service"
npm install
npm run build

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " Build Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

Set-Location $rootDir
