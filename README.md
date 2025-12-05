# MCP VSCode Code Editor

A powerful AI-driven code editing system that enables AI clients to inspect, edit, and validate code through a headless VS Code instance controlled via Model Context Protocol (MCP).

## Overview

This project provides two MCP servers and a Docker-based headless VS Code environment:

## Features

### Repo MCP Server - File Operations
| Tool | Description |
|------|-------------|
| `list_files` | List files matching a glob pattern |
| `read_file` | Read file contents |
| `write_file` | Write content to a file |
| `apply_patch` | Apply a unified diff patch |
| `get_tree` | Get directory tree structure |

### VSCode MCP Server - Diagnostics
| Tool | Description |
|------|-------------|
| `open_file_in_vscode` | Open a file in headless VS Code |
| `get_diagnostics` | Get errors/warnings from language servers |
| `close_file` | Close an open file |

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm

### 1. Clone and Build

```bash
cd mcp-vscode-project

# Install and build all packages
.\scripts\build-all.ps1     # Windows
```

### 2. Configure Environment

```bash
# Copy example config
cp config/.env.example .env

# Edit with your paths
# ALLOWED_DIRECTORIES=/path/to/your/projects
# PROJECT_PATH=/path/to/project/to/mount
```

### 3. Start Docker Container

```bash
cd vscode-headless

# Set project path and start
PROJECT_PATH=/your/project docker-compose up -d
```

### 4. Configure MCP Client

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "repo-server": {
      "command": "node",
      "args": ["/path/to/mcp-vscode-project/servers/repo-mcp-server/dist/index.js"],
      "env": {
        "ALLOWED_DIRECTORIES": "/path/to/your/projects"
      }
    },
    "vscode-server": {
      "command": "node",
      "args": ["/path/to/mcp-vscode-project/servers/vscode-mcp-server/dist/index.js"],
      "env": {
        "VSCODE_SERVICE_URL": "http://localhost:5007"
      }
    }
  }
}
```

## Usage Example

Here's how an AI client would use the system:

```
1. AI: "Let me explore the project structure"
   → Calls: list_files(root_path="/workspace")
   
2. AI: "I'll read the main file"
   → Calls: read_file(path="/workspace/src/index.ts")
   
3. AI: "I need to fix this bug, let me apply a patch"
   → Calls: apply_patch(path="/workspace/src/index.ts", diff="...")
   
4. AI: "Now let me check for any errors"
   → Calls: get_diagnostics(project_root="/workspace")
   
5. AI: "There's a type error, let me fix it"
   → Calls: write_file(path="/workspace/src/index.ts", content="...")
   
6. AI: "Checking diagnostics again..."
   → Calls: get_diagnostics()
   → "No errors! Code is clean."
```

## Project Structure

```
mcp-vscode-project/
├── servers/
│   ├── repo-mcp-server/         # File operations MCP server
│   │   ├── src/
│   │   │   ├── index.ts         # Server entry point
│   │   │   ├── tools/           # Tool implementations
│   │   │   └── utils/           # Safety & diff utilities
│   │   └── package.json
│   └── vscode-mcp-server/       # VS Code bridge MCP server
│       ├── src/
│       │   ├── index.ts         # Server entry point
│       │   └── client/          # HTTP client for diagnostics
│       └── package.json
├── vscode-headless/
│   ├── Dockerfile               # OpenVSCode + diagnostics
│   ├── docker-compose.yml       # Container orchestration
│   ├── start.sh                 # Container startup script
│   └── diagnostics-service/     # REST API for diagnostics
│       └── src/index.ts
├── config/
│   ├── .env.example             # Environment template
│   └── mcp-config.example.json  # MCP client config example
├── scripts/
│   ├── build-all.ps1/sh         # Build all packages
│   └── dev-start.ps1/sh         # Start dev environment
└── README.md
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ALLOWED_DIRECTORIES` | Comma-separated allowed paths | None (required) |
| `VSCODE_SERVICE_URL` | Diagnostics service URL | `http://localhost:5007` |
| `PROJECT_PATH` | Project to mount in Docker | Current directory |
| `VSCODE_PORT` | VS Code web interface port | `3000` |
| `DIAGNOSTICS_PORT` | Diagnostics API port | `5007` |

## Diagnostics Response Format

```json
{
  "success": true,
  "diagnostics": [
    {
      "file": "/workspace/src/index.ts",
      "range": {
        "start": { "line": 10, "character": 5 },
        "end": { "line": 10, "character": 15 }
      },
      "severity": "error",
      "message": "Property 'foo' does not exist on type 'Bar'",
      "source": "typescript",
      "code": "TS2339"
    }
  ],
  "summary": {
    "totalErrors": 1,
    "totalWarnings": 0,
    "totalInfo": 0,
    "totalHints": 0,
    "totalFiles": 1
  }
}
```

## Security

The Repo MCP Server enforces security through:

- **Allowed Directories**: Only paths within `ALLOWED_DIRECTORIES` can be accessed
- **Path Traversal Prevention**: Resolved paths are validated against allowed roots
- **File Size Limits**: 10MB limit on file reads

## Supported Languages

The diagnostics service supports:
- **TypeScript/JavaScript** - via TypeScript compiler
- **ESLint** - if configured in project
- **Python** - via Pyright

## Development

```bash
# Start development environment
./scripts/dev-start.sh /path/to/your/project

# Watch mode for MCP servers
cd servers/repo-mcp-server && npm run dev
cd servers/vscode-mcp-server && npm run dev
```

## Troubleshooting

### Container not starting
```bash
# Check logs
docker-compose logs -f

# Rebuild
docker-compose up --build -d
```

### Diagnostics not working
```bash
# Check health
curl http://localhost:5007/health

# Check if TypeScript is installed in project
ls node_modules/typescript
```

### Permission errors
Ensure your project directory is accessible to Docker and the `ALLOWED_DIRECTORIES` is set correctly.

## License

MIT License - See [LICENSE](LICENSE)
