#!/bin/bash
# =======================================================
# Start Script for OpenVSCode + Diagnostics Service
# =======================================================

echo "Starting OpenVSCode Server with Diagnostics Service..."

# Start the diagnostics service in background
echo "Starting diagnostics service on port ${PORT:-5007}..."
cd /opt/diagnostics-service
node dist/index.js &

# Give diagnostics service time to start
sleep 2

# Start OpenVSCode Server
echo "Starting OpenVSCode Server on port 3000..."
exec /home/.openvscode-server/bin/openvscode-server \
    --host 0.0.0.0 \
    --port 3000 \
    --without-connection-token \
    /workspace
