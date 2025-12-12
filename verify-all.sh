#!/bin/bash

# Complete Verification Script for MCP VS Code Web Project
# Checks all components, connections, and configurations

echo "🔍 MCP VS Code Web - Complete System Verification"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track status
ALL_GOOD=true

# 1. Environment Variables
echo "1️⃣  Checking Environment Variables..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    
    # Check required variables
    if grep -q "GEMINI_API_KEY" .env; then
        echo -e "${GREEN}✅ GEMINI_API_KEY configured${NC}"
    else
        echo -e "${RED}❌ GEMINI_API_KEY missing${NC}"
        ALL_GOOD=false
    fi
    
    if grep -q "FIREBASE_PROJECT_ID" .env; then
        echo -e "${GREEN}✅ FIREBASE_PROJECT_ID configured${NC}"
    else
        echo -e "${RED}❌ FIREBASE_PROJECT_ID missing${NC}"
        ALL_GOOD=false
    fi
else
    echo -e "${RED}❌ .env file not found${NC}"
    ALL_GOOD=false
fi
echo ""

# 2. Firebase Credentials
echo "2️⃣  Checking Firebase Credentials..."
if [ -f "firebase/serviceAccountKey.json" ]; then
    echo -e "${GREEN}✅ Firebase service account key exists${NC}"
else
    echo -e "${RED}❌ Firebase service account key missing${NC}"
    ALL_GOOD=false
fi

if [ -f "firebase/firebase.json" ]; then
    echo -e "${GREEN}✅ Firebase hosting config exists${NC}"
else
    echo -e "${RED}❌ Firebase hosting config missing${NC}"
    ALL_GOOD=false
fi
echo ""

# 3. Frontend Build
echo "3️⃣  Checking Frontend Build..."
if [ -d "web-frontend/dist" ]; then
    echo -e "${GREEN}✅ Frontend dist directory exists${NC}"
    
    if [ -f "web-frontend/dist/index.html" ]; then
        echo -e "${GREEN}✅ index.html built${NC}"
    else
        echo -e "${RED}❌ index.html missing${NC}"
        ALL_GOOD=false
    fi
    
    if [ -d "web-frontend/dist/assets" ]; then
        echo -e "${GREEN}✅ Assets directory exists${NC}"
    else
        echo -e "${YELLOW}⚠️  Assets directory missing (might be empty build)${NC}"
    fi
else
    echo -e "${RED}❌ Frontend not built (run: cd web-frontend && npm run build)${NC}"
    ALL_GOOD=false
fi
echo ""

# 4. Backend Components
echo "4️⃣  Checking Backend Components..."
if [ -f "api-gateway/src/index-simple.ts" ]; then
    echo -e "${GREEN}✅ API Gateway main file exists${NC}"
else
    echo -e "${RED}❌ API Gateway main file missing${NC}"
    ALL_GOOD=false
fi

if [ -f "api-gateway/src/routes/assistant.ts" ]; then
    echo -e "${GREEN}✅ Gemini AI route exists${NC}"
else
    echo -e "${RED}❌ Gemini AI route missing${NC}"
    ALL_GOOD=false
fi

if [ -f "api-gateway/src/mcpClient.ts" ]; then
    echo -e "${GREEN}✅ MCP client exists${NC}"
else
    echo -e "${RED}❌ MCP client missing${NC}"
    ALL_GOOD=false
fi
echo ""

# 5. MCP Servers
echo "5️⃣  Checking MCP Servers..."
SERVERS=("repo-mcp-server" "git-mcp-server" "exec-mcp-server" "vscode-mcp-server" "github-mcp-server")
for server in "${SERVERS[@]}"; do
    if [ -d "servers/$server/dist" ]; then
        echo -e "${GREEN}✅ $server built${NC}"
    else
        echo -e "${YELLOW}⚠️  $server not built${NC}"
    fi
done
echo ""

# 6. Frontend Components
echo "6️⃣  Checking Frontend Components..."
COMPONENTS=(
    "FileTree.tsx"
    "MonacoEditor.tsx"
    "ExecutionPanel.tsx"
    "DiagnosticsPanel.tsx"
    "TerminalPane.tsx"
    "AssistantPanel.tsx"
    "DiffViewer.tsx"
    "GitPanel.tsx"
    "SearchPanel.tsx"
    "SettingsPanel.tsx"
)

COMPONENT_COUNT=0
for component in "${COMPONENTS[@]}"; do
    if [ -f "web-frontend/src/components/$component" ]; then
        COMPONENT_COUNT=$((COMPONENT_COUNT + 1))
    fi
done

echo -e "${GREEN}✅ $COMPONENT_COUNT/10 components found${NC}"
echo ""

# 7. Services
echo "7️⃣  Checking Frontend Services..."
if [ -f "web-frontend/src/services/mcpClient.ts" ]; then
    echo -e "${GREEN}✅ MCP client service${NC}"
fi

if [ -f "web-frontend/src/services/assistant.ts" ]; then
    echo -e "${GREEN}✅ Gemini AI service${NC}"
fi

if [ -f "web-frontend/src/services/terminalClient.ts" ]; then
    echo -e "${GREEN}✅ Terminal client service${NC}"
fi
echo ""

# 8. Documentation
echo "8️⃣  Checking Documentation..."
DOCS=(
    "README.md"
    "QUICK_START.md"
    "TROUBLESHOOTING.md"
    "SECURITY.md"
    "COMPLETE_STATUS.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✅ $doc${NC}"
    else
        echo -e "${YELLOW}⚠️  $doc missing${NC}"
    fi
done
echo ""

# 9. Git Status
echo "9️⃣  Checking Git Status..."
if [ -d ".git" ]; then
    echo -e "${GREEN}✅ Git repository initialized${NC}"
    
    # Check gitignore
    if grep -q "serviceAccountKey.json" .gitignore && grep -q ".env" .gitignore; then
        echo -e "${GREEN}✅ Sensitive files gitignored${NC}"
    else
        echo -e "${RED}❌ Gitignore incomplete${NC}"
        ALL_GOOD=false
    fi
else
    echo -e "${YELLOW}⚠️  Not a git repository${NC}"
fi
echo ""

# 10. Node Modules
echo "🔟 Checking Dependencies..."
if [ -d "web-frontend/node_modules" ]; then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${RED}❌ Frontend dependencies missing (run: cd web-frontend && npm install)${NC}"
    ALL_GOOD=false
fi

if [ -d "api-gateway/node_modules" ]; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Backend dependencies missing (run: cd api-gateway && npm install)${NC}"
    ALL_GOOD=false
fi
echo ""

# Final Summary
echo "=================================================="
if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✅ ALL SYSTEMS READY!${NC}"
    echo ""
    echo "🚀 You can now:"
    echo "   1. Start backend: cd api-gateway && npm run dev"
    echo "   2. Start frontend: cd web-frontend && npm run dev"
    echo "   3. Deploy: firebase deploy --only hosting"
else
    echo -e "${RED}❌ Some issues found. Please fix them before deploying.${NC}"
fi
echo "=================================================="
