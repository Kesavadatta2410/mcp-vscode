#!/bin/bash
# Development Startup Script
# Starts Docker container and MCP servers for development
# Run from project root: ./scripts/dev-start.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

PROJECT_PATH="${1:-$(pwd)}"
NO_BUILD="${2:-false}"
NO_DOCKER="${3:-false}"

echo "========================================"
echo " MCP VSCode Development Environment"
echo "========================================"

# Build if needed
if [ "$NO_BUILD" != "true" ]; then
    echo -e "\nBuilding packages..."
    "$ROOT_DIR/scripts/build-all.sh"
fi

# Set environment variables
export PROJECT_PATH="$PROJECT_PATH"
export ALLOWED_DIRECTORIES="$PROJECT_PATH"
export VSCODE_SERVICE_URL="http://localhost:5007"

echo -e "\nConfiguration:"
echo "  PROJECT_PATH: $PROJECT_PATH"
echo "  ALLOWED_DIRECTORIES: $ALLOWED_DIRECTORIES"
echo "  VSCODE_SERVICE_URL: $VSCODE_SERVICE_URL"

# Start Docker container
if [ "$NO_DOCKER" != "true" ]; then
    echo -e "\nStarting Docker container..."
    cd "$ROOT_DIR/vscode-headless"
    docker-compose up -d --build
    
    echo "Waiting for services to start..."
    sleep 10
    
    # Check health
    if curl -s http://localhost:5007/health > /dev/null; then
        echo "Diagnostics service is healthy!"
    else
        echo "Warning: Diagnostics service not responding yet"
    fi
fi

echo ""
echo "========================================"
echo " Environment Ready!"
echo "========================================"
echo ""
echo "Services Running:"
echo "  - VS Code Web: http://localhost:3000"
echo "  - Diagnostics API: http://localhost:5007"
echo ""
echo "To start MCP servers, run these commands in separate terminals:"
echo ""
echo "  # Repo MCP Server (file operations)"
echo "  node $ROOT_DIR/servers/repo-mcp-server/dist/index.js"
echo ""
echo "  # VSCode MCP Server (diagnostics)"
echo "  node $ROOT_DIR/servers/vscode-mcp-server/dist/index.js"
echo ""
echo "Or configure them in your MCP client config"
echo ""

cd "$ROOT_DIR"
