# MCP API Gateway

Backend server that bridges HTTP/WebSocket requests from the web frontend to MCP servers via stdio communication.

## Features

- **MCP Bridge**: Translates HTTP requests to MCP server stdio calls
- **Terminal WebSockets**: Real-time terminal access using node-pty
- **CORS Support**: Allows frontend development on different port
- **Auto-reconnect**: Automatically starts MCP servers on demand

## Quick Start

```bash
# Install dependencies
npm install

# Development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run in production
npm start
```

The server runs on http://localhost:4000 by default.

## API Endpoints

### MCP Tools
```http
POST /api/mcp/:server/:tool
Content-Type: application/json

{
  "arg1": "value1",
  "arg2": "value2"
}
```

**Servers**: `repo`, `git`, `github`, `vscode`, `exec`

**Examples**:
- `POST /api/mcp/repo/read_file` - Read a file
- `POST /api/mcp/exec/run_python_file` - Execute Python file
- `POST /api/mcp/git/git_status` - Get git status

### Terminal Management

#### Create Terminal
```http
POST /api/terminals/create
Content-Type: application/json

{
  "name": "My Terminal",
  "cols": 80,
  "rows": 24
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Terminal",
    "wsUrl": "/terminals?id=uuid"
  }
}
```

#### List Terminals
```http
GET /api/terminals/list
```

#### Resize Terminal
```http
POST /api/terminals/:id/resize
Content-Type: application/json

{
  "cols": 100,
  "rows": 30
}
```

#### Delete Terminal
```http
DELETE /api/terminals/:id
```

### WebSocket Terminal

Connect to terminal via WebSocket:
```javascript
const ws = new WebSocket('ws://localhost:4000/terminals?id=<terminal-id>');

// Receive output
ws.onmessage = (event) => {
  console.log('Output:', event.data);
};

// Send input
ws.send('ls\n');

// Resize
ws.send(JSON.stringify({ type: 'resize', cols: 100, rows: 30 }));
```

## Environment Variables

```bash
# Server port (default: 4000)
PORT=4000

# Project path for MCP servers
PROJECT_PATH=/path/to/project

# Allowed directories for file operations
ALLOWED_DIRECTORIES=/path/to/project

# Git repository path
GIT_REPO_PATH=/path/to/project

# Enable code execution
ENABLE_CODE_EXECUTION=true
```

## Architecture

```
┌─────────────┐         
│   Frontend  │         
│  (React)    │         
└──────┬──────┘         
       │ HTTP/WS        
       ▼                
┌─────────────┐         
│ API Gateway │         
│  (Express)  │         
└──────┬──────┘         
       │ stdio         
       ▼                
┌─────────────┐         
│ MCP Servers │         
│ (repo/git/  │         
│  exec/etc)  │         
└─────────────┘         
```

### How it Works

1. **Frontend** makes HTTP request to `/api/mcp/:server/:tool`
2. **Gateway** spawns corresponding MCP server process (if not already running)
3. **Gateway** sends JSON-RPC request via stdio to server
4. **MCP Server** processes request and returns JSON-RPC response
5. **Gateway** forwards response back to frontend

For terminals:
1. **Frontend** requests terminal creation via `/api/terminals/create`
2. **Gateway** spawns shell using node-pty
3. **Frontend** connects via WebSocket to `/terminals?id=<id>`
4. **Gateway** pipes terminal I/O bidirectionally over WebSocket

## Security

- **Terminal commands**: Runs with same permissions as gateway process
- **File access**: Restricted to `ALLOWED_DIRECTORIES`
- **Inactivity timeout**: Terminals auto-close after 30min of inactivity
- **Max terminals**: Limited to 10 concurrent terminals per gateway instance

## Development

### Hot Reload
```bash
npm run dev
```

Uses `tsx watch` for instant TypeScript compilation and server restart.

### Testing with Frontend

1. Start gateway: `npm run dev`
2. Start frontend: `cd ../web-frontend && npm run dev`
3. Frontend proxies `/api` and `/terminals` to gateway

## Production Deployment

### Option 1: Node.js Server
```bash
npm run build
PORT=4000 npm start
```

### Option 2: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Option 3: PM2
```bash
pm2 start dist/index.js --name mcp-gateway
pm2 save
```

## Troubleshooting

### MCP Server Not Found
Ensure MCP servers are built:
```bash
cd ../servers/repo-mcp-server
npm run build
```

### Terminal Not Working on Windows
Windows uses PowerShell by default. To use CMD or WSL bash:
```typescript
// In terminalManager.ts
const shell = 'cmd.exe'; // or 'wsl.exe'
```

### CORS Errors
Add frontend origin to CORS config:
```typescript
app.use(cors({
  origin: 'http://localhost:3000'
}));
```

## License

MIT
