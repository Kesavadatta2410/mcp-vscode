# Quick Start Commands for Windows PowerShell

## Start Both Frontend and Backend

Open TWO separate PowerShell terminals:

### Terminal 1 - API Gateway (Backend)
```powershell
cd E:\Vscode\Mcpserver\mcp-vscode-project\api-gateway
npm install --no-optional
npm run dev
```

### Terminal 2 - Web Frontend
```powershell
cd E:\Vscode\Mcpserver\mcp-vscode-project\web-frontend
npm install
npm run dev
```

Then visit: http://localhost:3000

## Alternative: One Terminal with Sequential Commands

```powershell
# Start backend in background (if available)
cd E:\Vscode\Mcpserver\mcp-vscode-project\api-gateway
npm install --no-optional
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm run dev"

# Start frontend
cd ..\web-frontend
npm install
npm run dev
```

## Build All MCP Servers First

Before running the API gateway, ensure all MCP servers are built:

```powershell
cd E:\Vscode\Mcpserver\mcp-vscode-project

# Build each server
cd servers\repo-mcp-server
npm install
npm run build

cd ..\git-mcp-server
npm install
npm run build

cd ..\github-mcp-server
npm install
npm run build

cd ..\exec-mcp-server
npm install
npm run build

cd ..\vscode-mcp-server
npm install
npm run build

cd ..\..
```

## Notes

- Use `;` instead of `&&` in PowerShell
- Node-pty is optional - terminals won't work without it, but everything else will
- Backend runs on port 4000
- Frontend runs on port 3000
