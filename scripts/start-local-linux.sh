#!/bin/bash
# Cross-platform MCP Server Launcher for Linux/Mac
# This script starts the local MCP servers

echo "==============================="
echo "  MCP-VSCode Local Server"
echo "==============================="
echo ""

# Get project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# Load environment variables if .env exists
if [ -f .env ]; then
    echo "Loading environment variables from .env..."
    export $(grep -v '^#' .env | xargs)
fi

# Set defaults if not configured
export PROJECT_PATH="${PROJECT_PATH:-$PWD}"
export ALLOWED_DIRECTORIES="${ALLOWED_DIRECTORIES:-$PWD}"
export GIT_REPO_PATH="${GIT_REPO_PATH:-$PWD}"

echo ""
echo "Configuration:"
echo "  PROJECT_PATH=$PROJECT_PATH"
echo "  ALLOWED_DIRECTORIES=$ALLOWED_DIRECTORIES"
echo "  GIT_REPO_PATH=$GIT_REPO_PATH"

# Check for GITHUB_TOKEN
if [ -n "$GITHUB_TOKEN" ]; then
    echo "  GITHUB_TOKEN=configured"
else
    echo "  GITHUB_TOKEN=not set (GitHub features will not work)"
fi

echo ""
echo "Available MCP servers:"
echo "  [1] Repo MCP Server (file operations)"
echo "  [2] Git MCP Server (git operations)"
echo "  [3] GitHub MCP Server (GitHub API)"
echo "  [4] VSCode MCP Server (diagnostics bridge)"

read -p "Select server to start (1-4): " choice

case $choice in
    1)
        echo ""
        echo "Starting Repo MCP Server..."
        cd servers/repo-mcp-server
        export ALLOWED_DIRECTORIES="$ALLOWED_DIRECTORIES"
        node dist/index.js
        ;;
    2)
        echo ""
        echo "Starting Git MCP Server..."
        cd servers/git-mcp-server
        export GIT_REPO_PATH="$GIT_REPO_PATH"
        export PROJECT_PATH="$PROJECT_PATH"
        node dist/index.js
        ;;
    3)
        echo ""
        echo "Starting GitHub MCP Server..."
        if [ -z "$GITHUB_TOKEN" ]; then
            echo "ERROR: GITHUB_TOKEN environment variable must be set"
            echo "Generate a token at: https://github.com/settings/tokens"
            exit 1
        fi
        cd servers/github-mcp-server
        export GITHUB_TOKEN="$GITHUB_TOKEN"
        node dist/index.js
        ;;
    4)
        echo ""
        echo "Starting VSCode MCP Server..."
        export VSCODE_SERVICE_URL="${VSCODE_SERVICE_URL:-http://localhost:5007}"
        cd servers/vscode-mcp-server
        node dist/index.js
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac
