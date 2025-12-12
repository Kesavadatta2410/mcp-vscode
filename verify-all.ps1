# Complete Verification Script for MCP VS Code Web Project (PowerShell)
# Checks all components, connections, and configurations

Write-Host "`n🔍 MCP VS Code Web - Complete System Verification" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

$AllGood = $true

# 1. Environment Variables
Write-Host "1️⃣  Checking Environment Variables..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Write-Host "✅ .env file exists" -ForegroundColor Green
    
    $envContent = Get-Content ".env" -Raw
    if ($envContent -match "GEMINI_API_KEY") {
        Write-Host "✅ GEMINI_API_KEY configured" -ForegroundColor Green
    } else {
        Write-Host "❌ GEMINI_API_KEY missing" -ForegroundColor Red
        $AllGood = $false
    }
    
    if ($envContent -match "FIREBASE_PROJECT_ID") {
        Write-Host "✅ FIREBASE_PROJECT_ID configured" -ForegroundColor Green
    } else {
        Write-Host "❌ FIREBASE_PROJECT_ID missing" -ForegroundColor Red
        $AllGood = $false
    }
} else {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    $AllGood = $false
}
Write-Host ""

# 2. Firebase Credentials
Write-Host "2️⃣  Checking Firebase Credentials..." -ForegroundColor Yellow
if (Test-Path "firebase/serviceAccountKey.json") {
    Write-Host "✅ Firebase service account key exists" -ForegroundColor Green
} else {
    Write-Host "❌ Firebase service account key missing" -ForegroundColor Red
    $AllGood = $false
}

if (Test-Path "firebase/firebase.json") {
    Write-Host "✅ Firebase hosting config exists" -ForegroundColor Green
} else {
    Write-Host "❌ Firebase hosting config missing" -ForegroundColor Red
    $AllGood = $false
}
Write-Host ""

# 3. Frontend Build
Write-Host "3️⃣  Checking Frontend Build..." -ForegroundColor Yellow
if (Test-Path "web-frontend/dist") {
    Write-Host "✅ Frontend dist directory exists" -ForegroundColor Green
    
    if (Test-Path "web-frontend/dist/index.html") {
        Write-Host "✅ index.html built" -ForegroundColor Green
    } else {
        Write-Host "❌ index.html missing" -ForegroundColor Red
        $AllGood = $false
    }
    
    if (Test-Path "web-frontend/dist/assets") {
        Write-Host "✅ Assets directory exists" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Assets directory missing" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Frontend not built (run: cd web-frontend; npm run build)" -ForegroundColor Red
    $AllGood = $false
}
Write-Host ""

# 4. Backend Components
Write-Host "4️⃣  Checking Backend Components..." -ForegroundColor Yellow
if (Test-Path "api-gateway/src/index-simple.ts") {
    Write-Host "✅ API Gateway main file exists" -ForegroundColor Green
} else {
    Write-Host "❌ API Gateway main file missing" -ForegroundColor Red
    $AllGood = $false
}

if (Test-Path "api-gateway/src/routes/assistant.ts") {
    Write-Host "✅ Gemini AI route exists" -ForegroundColor Green
} else {
    Write-Host "❌ Gemini AI route missing" -ForegroundColor Red
    $AllGood = $false
}

if (Test-Path "api-gateway/src/mcpClient.ts") {
    Write-Host "✅ MCP client exists" -ForegroundColor Green
} else {
    Write-Host "❌ MCP client missing" -ForegroundColor Red
    $AllGood = $false
}
Write-Host ""

# 5. MCP Servers
Write-Host "5️⃣  Checking MCP Servers..." -ForegroundColor Yellow
$servers = @("repo-mcp-server", "git-mcp-server", "exec-mcp-server", "vscode-mcp-server", "github-mcp-server")
foreach ($server in $servers) {
    if (Test-Path "servers/$server/dist") {
        Write-Host "✅ $server built" -ForegroundColor Green
    } else {
        Write-Host "⚠️  $server not built" -ForegroundColor Yellow
    }
}
Write-Host ""

# 6. Frontend Components
Write-Host "6️⃣  Checking Frontend Components..." -ForegroundColor Yellow
$components = @(
    "FileTree.tsx",
    "MonacoEditor.tsx",
    "ExecutionPanel.tsx",
    "DiagnosticsPanel.tsx",
    "TerminalPane.tsx",
    "AssistantPanel.tsx",
    "DiffViewer.tsx",
    "GitPanel.tsx",
    "SearchPanel.tsx",
    "SettingsPanel.tsx"
)

$componentCount = 0
foreach ($component in $components) {
    if (Test-Path "web-frontend/src/components/$component") {
        $componentCount++
    }
}

Write-Host "✅ $componentCount/10 components found" -ForegroundColor Green
Write-Host ""

# 7. Services
Write-Host "7️⃣  Checking Frontend Services..." -ForegroundColor Yellow
if (Test-Path "web-frontend/src/services/mcpClient.ts") {
    Write-Host "✅ MCP client service" -ForegroundColor Green
}

if (Test-Path "web-frontend/src/services/assistant.ts") {
    Write-Host "✅ Gemini AI service" -ForegroundColor Green
}

if (Test-Path "web-frontend/src/services/terminalClient.ts") {
    Write-Host "✅ Terminal client service" -ForegroundColor Green
}
Write-Host ""

# 8. Documentation
Write-Host "8️⃣  Checking Documentation..." -ForegroundColor Yellow
$docs = @("README.md", "QUICK_START.md", "TROUBLESHOOTING.md", "SECURITY.md", "COMPLETE_STATUS.md")
foreach ($doc in $docs) {
    if (Test-Path $doc) {
        Write-Host "✅ $doc" -ForegroundColor Green
    } else {
        Write-Host "⚠️  $doc missing" -ForegroundColor Yellow
    }
}
Write-Host ""

# 9. Git Status
Write-Host "9️⃣  Checking Git Status..." -ForegroundColor Yellow
if (Test-Path ".git") {
    Write-Host "✅ Git repository initialized" -ForegroundColor Green
    
    $gitignoreContent = Get-Content ".gitignore" -Raw
    if ($gitignoreContent -match "serviceAccountKey.json" -and $gitignoreContent -match ".env") {
        Write-Host "✅ Sensitive files gitignored" -ForegroundColor Green
    } else {
        Write-Host "❌ Gitignore incomplete" -ForegroundColor Red
        $AllGood = $false
    }
} else {
    Write-Host "⚠️  Not a git repository" -ForegroundColor Yellow
}
Write-Host ""

# 10. Node Modules
Write-Host "🔟 Checking Dependencies..." -ForegroundColor Yellow
if (Test-Path "web-frontend/node_modules") {
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Frontend dependencies missing (run: cd web-frontend; npm install)" -ForegroundColor Red
    $AllGood = $false
}

if (Test-Path "api-gateway/node_modules") {
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Backend dependencies missing (run: cd api-gateway; npm install)" -ForegroundColor Red
    $AllGood = $false
}
Write-Host ""

# Final Summary
Write-Host "==================================================" -ForegroundColor Cyan
if ($AllGood) {
    Write-Host "✅ ALL SYSTEMS READY!" -ForegroundColor Green
    Write-Host ""
    Write-Host "🚀 You can now:" -ForegroundColor Cyan
    Write-Host "   1. Start backend: cd api-gateway; npm run dev" -ForegroundColor White
    Write-Host "   2. Start frontend: cd web-frontend; npm run dev" -ForegroundColor White
    Write-Host "   3. Deploy: firebase deploy --only hosting" -ForegroundColor White
} else {
    Write-Host "❌ Some issues found. Please fix them before deploying." -ForegroundColor Red
}
Write-Host "==================================================" -ForegroundColor Cyan
