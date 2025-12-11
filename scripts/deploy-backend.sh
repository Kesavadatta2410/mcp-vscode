#!/bin/bash

# Deploy API Gateway to Cloud Run or Docker
# Usage: ./deploy-backend.sh

set -e

echo "========================================"
echo "  Deploying API Gateway"
echo "========================================"

# Navigate to api-gateway directory
cd "$(dirname "$0")/../api-gateway"

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🏗️  Building TypeScript..."
npm run build

# Option 1: Deploy to Cloud Run (uncomment to use)
# gcloud run deploy mcp-api-gateway \
#   --source . \
#   --platform managed \
#   --region us-central1 \
#   --allow-unauthenticated \
#   --set-env-vars="ENABLE_CODE_EXECUTION=true"

# Option 2: Build Docker image (uncomment to use)
# docker build -t mcp-api-gateway .
# docker tag mcp-api-gateway gcr.io/YOUR_PROJECT/mcp-api-gateway
# docker push gcr.io/YOUR_PROJECT/mcp-api-gateway

echo ""
echo "✅ Backend built successfully!"
echo "Note: Update deployment commands above for your environment"
echo "========================================"
