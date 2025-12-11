# Troubleshooting npm Install Errors

## Error: esbuild version mismatch

**Symptom:**
```
Error: Expected "0.27.1" but got "0.21.5"
```

**Solution:**
```powershell
cd api-gateway

# Clean everything
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm cache clean --force

# Fresh install
npm install --omit=optional
```

## Error: EPERM operation not permitted

**Symptom:**
```
npm warn cleanup   [Error: EPERM: operation not permitted, rmdir...]
```

**Cause:** Windows file locks from running processes or antivirus

**Solutions:**

### 1. Close all processes
- Close VS Code
- Close any terminal windows
- Close Node.js processes in Task Manager

### 2. Run as Administrator
```powershell
# Right-click PowerShell → Run as Administrator
cd E:\Vscode\Mcpserver\mcp-vscode-project\api-gateway
Remove-Item -Recurse -Force node_modules
npm install --omit=optional
```

### 3. Temporarily disable antivirus
- Pause Windows Defender Real-time Protection
- Try npm install again
- Re-enable protection after install

### 4. Use npm ci instead
```powershell
npm ci --omit=optional
```

## Error: ECONNREFUSED (Frontend → Backend)

**Symptom:**
```
[vite] http proxy error: /api/mcp/repo/get_tree
AggregateError [ECONNREFUSED]
```

**Cause:** Backend (api-gateway) is not running

**Solution:**
Start the backend server in a separate terminal:

```powershell
cd api-gateway
npm run dev
```

The backend must be running on port 4000 for the frontend to work.

## Complete Fresh Start

If all else fails:

```powershell
# 1. Close all terminals and VS Code

# 2. Open new PowerShell as Administrator

# 3. Clean backend
cd E:\Vscode\Mcpserver\mcp-vscode-project\api-gateway
taskkill /F /IM node.exe
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force
npm install --omit=optional

# 4. Start backend
npm run dev

# 5. In NEW terminal, start frontend
cd ..\web-frontend
npm run dev
```

## Verify Backend is Running

Check these:

1. **Backend console should show:**
```
╔════════════════════════════════════════════╗
║   MCP API Gateway                          ║
║   Port: 4000                               ║
╚════════════════════════════════════════════╝
```

2. **Test backend manually:**
```powershell
curl http://localhost:4000/health
```

Should return: `{"status":"ok","timestamp":"..."}`

3. **Check port 4000:**
```powershell
netstat -ano | findstr :4000
```

Should show LISTENING on port 4000.

## Still Having Issues?

### Skip optional dependencies entirely
```powershell
npm install --legacy-peer-deps --omit=optional
```

### Use yarn instead of npm
```powershell
npm install -g yarn
cd api-gateway
yarn install
yarn dev
```

### Check Node version
```powershell
node --version  # Should be 18+
npm --version   # Should be 9+
```

If using old versions, update Node.js from [nodejs.org](https://nodejs.org)
