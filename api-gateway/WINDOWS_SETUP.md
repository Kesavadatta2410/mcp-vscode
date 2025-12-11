# API Gateway Setup for Windows

## Node-pty Build Error Fix

If you encounter `node-pty` build errors on Windows, you have two options:

### Option 1: Skip Terminal Features (Recommended for Quick Start)

```bash
# Install without optional dependencies
cd api-gateway
npm install --no-optional

# Start server (terminals disabled)
npm run dev
```

The API gateway will work fine without terminals. You can still use:
- File operations via MCP
- Code execution
- Git operations
- All other MCP features

### Option 2: Install Build Tools for Full Terminal Support

1. Install Visual Studio Build Tools:
```bash
# Run as Administrator
npm install --global windows-build-tools
```

Or manually install:
- [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022)
- Select "Desktop development with C++"

2. Install Python 3.x (required by node-gyp):
- [Python 3.11+](https://www.python.org/downloads/)
- During installation, check "Add Python to PATH"

3. Install node-pty:
```bash
npm install node-pty
```

4. Start server:
```bash
npm run dev
```

## PowerShell Command Syntax

PowerShell uses `;` instead of `&&`:

```powershell
# Wrong
npm install && npm run dev

# Correct
npm install; npm run dev
```

Or run separately:
```powershell
npm install
npm run dev
```

## Troubleshooting

### "Cannot find module 'node-pty'"
This is expected if you used `--no-optional`. Terminal features are disabled but everything else works.

### Build errors persist
1. Ensure Visual Studio Build Tools are installed
2. Restart terminal after installing tools
3. Try: `npm config set msvs_version 2022`
4. Clear cache: `npm cache clean --force`
