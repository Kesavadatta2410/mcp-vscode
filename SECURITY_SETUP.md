# MCP VS Code Project - Configuration & Security Guide

## Quick Setup

### 1. Get a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Create API Key"
3. Copy the key

### 2. Configure Environment

Edit the `.env` file in the project root:

```env
# REQUIRED: Replace with your valid Gemini API key
GEMINI_API_KEY=AIzaSy...your-key-here...

# Firebase (optional, for deployment)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase/serviceAccountKey.json

# API Gateway paths
PROJECT_PATH=E:\Vscode\Mcpserver\mcp-vscode-project
ALLOWED_DIRECTORIES=E:\Vscode\Mcpserver\mcp-vscode-project
GIT_REPO_PATH=E:\Vscode\Mcpserver\mcp-vscode-project

# Security settings
ENABLE_CODE_EXECUTION=true
PORT=4000

# Frontend URLs
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:4000
```

### 3. Test Your API Key

Run this command to verify:

```powershell
$apiKey = "YOUR_API_KEY"
$body = '{"contents":[{"parts":[{"text":"Hello"}]}]}'
Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=$apiKey" -Method POST -ContentType "application/json" -Body $body
```

---

## Security Measures

### 1. Environment Variables
- ✅ API keys stored in `.env` file
- ✅ `.env` is in `.gitignore` (never commit!)
- ✅ Dotenv loading with explicit path

### 2. Allowed Directories
The `ALLOWED_DIRECTORIES` env var restricts file operations:
```env
ALLOWED_DIRECTORIES=E:\Vscode\Mcpserver\mcp-vscode-project
```

### 3. Code Execution Safety
- Controlled by `ENABLE_CODE_EXECUTION` flag
- Sandboxed in child processes
- No shell injection (arguments are sanitized)

### 4. CORS Configuration
API Gateway only accepts requests from localhost:3000 in development.

---

## Before DNS/Production Deployment

### Required Steps:

1. **Generate NEW API keys** for production
2. **Set environment variables** on hosting platform (not in code)
3. **Enable HTTPS** for all endpoints
4. **Configure CORS** to accept only your domain
5. **Add rate limiting** to prevent abuse
6. **Add authentication** for sensitive endpoints

### Firebase Deployment Checklist:

```bash
# 1. Login to Firebase
firebase login

# 2. Initialize (if not done)
firebase init hosting functions

# 3. Set environment secrets
firebase functions:secrets:set GEMINI_API_KEY

# 4. Deploy
firebase deploy
```

### Recommended Production .env:

```env
# DON'T PUT THESE IN CODE - USE PLATFORM SECRETS
GEMINI_API_KEY=${GEMINI_API_KEY}  # Set via Firebase/Cloud secrets
FIREBASE_PROJECT_ID=your-production-project

# Restrict directories on production server  
ALLOWED_DIRECTORIES=/app/workspace
PROJECT_PATH=/app/workspace
GIT_REPO_PATH=/app/workspace

# Security
ENABLE_CODE_EXECUTION=false  # Disable in production unless needed
NODE_ENV=production

# URLs
VITE_API_URL=https://your-api.domain.com
VITE_WS_URL=wss://your-api.domain.com
```

---

## Current Status

| Item | Status |
|------|--------|
| Dotenv loading | ✅ Fixed |
| Gemini API key | ⚠️ Needs new key |
| Allowed directories | ✅ Configured |
| Code execution safety | ✅ Feature flagged |
| Production secrets | ⚠️ Not deployed |

---

## Getting a New Gemini API Key

Your current API key appears to be invalid or expired. Here's how to get a new one:

1. Visit https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Select a Google Cloud project (or create new)
5. Copy the generated key
6. Paste it in your `.env` file:
   ```
   GEMINI_API_KEY=AIzaSy...your-new-key...
   ```
7. Restart the API Gateway:
   ```powershell
   cd api-gateway
   npm run dev
   ```
