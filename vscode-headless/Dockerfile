# =======================================================
# OpenVSCode Server with Diagnostics Service
# =======================================================
# This Dockerfile creates a headless VS Code environment
# with language servers and a REST API for diagnostics.
# =======================================================

FROM gitpod/openvscode-server:latest

USER root

# Install additional dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 (LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install global npm packages for language servers
RUN npm install -g \
    typescript \
    typescript-language-server \
    eslint \
    @eslint/js \
    pyright

# Install Python tools
RUN pip3 install --break-system-packages \
    pyright \
    mypy

# Create workspace directory
RUN mkdir -p /workspace && chown -R openvscode-server:openvscode-server /workspace

# Copy diagnostics service
COPY --chown=openvscode-server:openvscode-server diagnostics-service /opt/diagnostics-service

# Build diagnostics service
WORKDIR /opt/diagnostics-service
RUN npm install && npm run build

# Switch back to non-root user
USER openvscode-server

# Set workspace
WORKDIR /workspace

# Environment variables
ENV PORT=5007
ENV WORKSPACE_PATH=/workspace

# Expose ports
# 3000 - OpenVSCode Server web interface
# 5007 - Diagnostics service REST API
EXPOSE 3000 5007

# Create startup script
COPY --chown=openvscode-server:openvscode-server start.sh /opt/start.sh
RUN chmod +x /opt/start.sh

# Start both services
CMD ["/opt/start.sh"]
