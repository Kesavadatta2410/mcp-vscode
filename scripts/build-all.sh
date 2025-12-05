#!/bin/bash
# Build All Packages Script
# Run from the project root: ./scripts/build-all.sh

set -e

echo "========================================"
echo " Building MCP VSCode Project"
echo "========================================"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Install root dependencies
echo -e "\n[1/4] Installing root dependencies..."
cd "$ROOT_DIR"
npm install

# Build Repo MCP Server
echo -e "\n[2/4] Building Repo MCP Server..."
cd "$ROOT_DIR/servers/repo-mcp-server"
npm install
npm run build

# Build VSCode MCP Server
echo -e "\n[3/4] Building VSCode MCP Server..."
cd "$ROOT_DIR/servers/vscode-mcp-server"
npm install
npm run build

# Build Diagnostics Service
echo -e "\n[4/4] Building Diagnostics Service..."
cd "$ROOT_DIR/vscode-headless/diagnostics-service"
npm install
npm run build

echo -e "\n========================================"
echo " Build Complete!"
echo "========================================"

cd "$ROOT_DIR"
