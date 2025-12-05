# MCP VSCode Code Editor

A powerful AI-driven code editing system that enables AI clients to control a headless VS Code instance with **full VS Code functionality** via Model Context Protocol (MCP).

## Overview

This project provides comprehensive MCP servers that expose nearly all VS Code features to AI clients:

- **File Operations** - Read, write, apply patches
- **Diagnostics** - Code errors and warnings from language servers
- **Extension Management** - Install, uninstall, enable, disable extensions
- **Search** - Full-text and symbol search
- **Code Intelligence** - Code actions, formatting, go-to-definition, find references
- **Command Execution** - Run any VS Code command
- **Terminal** - Create and interact with terminals (optional)
- **Debug** - Debug sessions and breakpoints (optional)
- **Tasks** - Run build, test, and custom tasks

## Features

### Repo MCP Server - File Operations

| Tool | Description |
|------|-------------|
| `list_files` | List files matching a glob pattern |
| `read_file` | Read file contents |
| `write_file` | Write content to a file |
| `apply_patch` | Apply a unified diff patch |
| `get_tree` | Get directory tree structure |

### VSCode MCP Server - Full VS Code Control

#### Core Operations
| Tool | Description |
|------|-------------|
| `open_file_in_vscode` | Open a file in headless VS Code |
| `close_file` | Close an open file |
| `save_file` | Save a file (with optional content) |
| `list_open_files` | List tracked open files |
| `get_diagnostics` | Get errors/warnings from language servers |

#### Extension Management
| Tool | Description |
|------|-------------|
| `list_extensions` | List installed extensions |
| `install_extension` | Install extension by marketplace ID |
| `uninstall_extension` | Uninstall an extension |
| `enable_extension` | Enable a disabled extension |
| `disable_extension` | Disable an extension |

#### Search
| Tool | Description |
|------|-------------|
| `search_text` | Full-text search across files |
| `search_symbols` | Search for symbols (functions, classes) |

#### Code Intelligence
| Tool | Description |
|------|-------------|
| `get_code_actions` | Get quick fixes and refactorings |
| `format_document` | Format a document |
| `go_to_definition` | Find symbol definition |
| `find_references` | Find all references to a symbol |

#### Commands & Settings
| Tool | Description |
|------|-------------|
| `execute_command` | Execute any VS Code command by ID |
| `get_settings` | Get user/workspace settings |
| `update_settings` | Update settings |

#### Tasks
| Tool | Description |
|------|-------------|
| `list_tasks` | List available tasks |
| `run_task` | Run a task or npm script |

#### Terminal (if enabled)
| Tool | Description |
|------|-------------|
| `create_terminal` | Create a new terminal |
| `terminal_send` | Send input to terminal |
| `terminal_read` | Read terminal output |
| `close_terminal` | Close a terminal |

#### Debug (if enabled)
| Tool | Description |
|------|-------------|
| `debug_start` | Start debug session |
| `debug_set_breakpoint` | Set/remove breakpoint |
| `debug_stop` | Stop debug session |

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
./scripts/build-all.sh      # Linux/Mac
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
        "VSCODE_SERVICE_URL": "http://localhost:5007",
        "DISABLE_TERMINAL": "false",
        "DISABLE_DEBUG": "false"
      }
    }
  }
}
```

## Example Workflows

### Install an Extension via MCP

```
AI: "I'll install the Python extension"
→ Calls: install_extension(extension_id="ms-python.python")
→ Returns: { success: true, message: "Extension installed" }
```

### Format a Document

```
AI: "Let me format this file"
→ Calls: format_document(path="/workspace/src/index.ts")
→ Returns: { success: true, content: "// Formatted code..." }
```

### Full-Text Search

```
AI: "I'll search for TODO comments"
→ Calls: search_text(query="TODO:", path="/workspace", max_results=50)
→ Returns matched files, lines, and context
```

### Code Intelligence Workflow

```
1. AI: "Let me find where this function is defined"
   → Calls: go_to_definition(path="/workspace/src/app.ts", symbol="handleRequest")
   → Returns: [{ file: "/workspace/src/handlers.ts", line: 45 }]

2. AI: "Now find all usages"
   → Calls: find_references(path="/workspace/src/handlers.ts", symbol="handleRequest")
   → Returns: List of all files/locations referencing handleRequest
```

### Debug Session (if enabled)

```
1. AI: "Start a debug session"
   → Calls: debug_start(config={ type: "node", program: "${workspaceFolder}/app.js" })
   → Returns: { sessionId: "abc123" }

2. AI: "Set a breakpoint"
   → Calls: debug_set_breakpoint(session_id="abc123", file="/workspace/app.js", line=42)

3. AI: "Stop debugging"
   → Calls: debug_stop(session_id="abc123")
```

## Security

### Allowlists

Configure in environment variables:

```bash
# Only allow specific VS Code commands
ALLOWED_VSCODE_COMMANDS=workbench.action.files.save,editor.action.formatDocument

# Only allow specific extensions
ALLOWED_EXTENSIONS=ms-python.python,dbaeumer.vscode-eslint
```

### Feature Toggles

```bash
# Disable terminal for security
DISABLE_TERMINAL=true

# Disable debug capabilities
DISABLE_DEBUG=true

# Enable security logging
SECURITY_LOGGING=true
```

### Path Security

The Repo MCP Server enforces:
- **Allowed Directories**: Only paths within `ALLOWED_DIRECTORIES` can be accessed
- **Path Traversal Prevention**: Resolved paths are validated
- **File Size Limits**: 10MB limit on file reads

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ALLOWED_DIRECTORIES` | Comma-separated allowed paths | None (required) |
| `VSCODE_SERVICE_URL` | VS Code service URL | `http://localhost:5007` |
| `PROJECT_PATH` | Project to mount in Docker | Current directory |
| `VSCODE_PORT` | VS Code web interface port | `3000` |
| `DIAGNOSTICS_PORT` | Service API port | `5007` |
| `DISABLE_TERMINAL` | Disable terminal features | `false` |
| `DISABLE_DEBUG` | Disable debug features | `false` |
| `SECURITY_LOGGING` | Log sensitive operations | `true` |
| `ALLOWED_VSCODE_COMMANDS` | Command allowlist | Empty (allow all) |
| `ALLOWED_EXTENSIONS` | Extension allowlist | Empty (allow all) |

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
│       │   ├── index.ts         # Server with all tools
│       │   ├── types.ts         # Type definitions
│       │   └── client/          # HTTP client for service
│       └── package.json
├── vscode-headless/
│   ├── Dockerfile               # OpenVSCode + service
│   ├── docker-compose.yml       # Container orchestration
│   ├── start.sh                 # Container startup script
│   └── diagnostics-service/     # REST API service
│       └── src/index.ts         # Full VS Code API
├── config/
│   ├── .env.example             # Environment template
│   └── mcp-config.example.json  # MCP client config
├── scripts/
│   ├── build-all.ps1/sh         # Build all packages
│   └── dev-start.ps1/sh         # Start dev environment
└── README.md
```

## Supported Languages

The service supports diagnostics for:
- **TypeScript/JavaScript** - via TypeScript compiler
- **ESLint** - if configured in project
- **Python** - via Pyright

Formatting is supported via:
- **Prettier** - for JS/TS/JSON
- **ESLint** - as fallback
- **Black** - for Python

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

### Service not responding
```bash
# Check health
curl http://localhost:5007/health

# Should return:
# { "status": "ok", "version": "2.0.0", "features": {...} }
```

### Extension operations failing
```bash
# Extensions require VS Code CLI - check if available
docker exec -it vscode-headless which code
```

### Terminal/Debug disabled
Check that `DISABLE_TERMINAL` and `DISABLE_DEBUG` are set to `false` in your environment.

## API Reference

The VS Code service exposes these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/open` | POST | Open file |
| `/close` | POST | Close file |
| `/diagnostics` | GET | Get diagnostics |
| `/extensions` | GET | List extensions |
| `/extensions/install` | POST | Install extension |
| `/extensions/uninstall` | POST | Uninstall extension |
| `/search/text` | POST | Full-text search |
| `/search/symbols` | POST | Symbol search |
| `/code/actions` | POST | Get code actions |
| `/code/format` | POST | Format document |
| `/code/definition` | POST | Go to definition |
| `/code/references` | POST | Find references |
| `/command/execute` | POST | Execute command |
| `/workspace/settings` | GET/POST | Settings |
| `/tasks` | GET | List tasks |
| `/tasks/run` | POST | Run task |
| `/terminal/create` | POST | Create terminal |
| `/terminal/:id` | GET/DELETE | Read/close terminal |
| `/debug/start` | POST | Start debug |
| `/debug/breakpoint` | POST | Set breakpoint |
| `/debug/stop` | DELETE | Stop debug |

## License

MIT License - See [LICENSE](LICENSE)
