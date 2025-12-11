#!/bin/bash

# Deploy Frontend to Firebase Hosting
# Usage: ./deploy-frontend.sh

set -e

echo "========================================"
echo "  Deploying Frontend to Firebase"
echo "========================================"

# Navigate to frontend directory
cd "$(dirname "$0")/../web-frontend"

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🏗️  Building production bundle..."
npm run build

echo ""
echo "🚀 Deploying to Firebase Hosting..."
cd ..
firebase deploy --only hosting

echo ""
echo "✅ Frontend deployed successfully!"
echo "========================================"
