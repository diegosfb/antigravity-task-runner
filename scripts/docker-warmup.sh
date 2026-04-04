#!/bin/bash

# ==============================================================================
# Docker Desktop Warm-up Script (macOS)
# Ensures Docker Desktop is running, out of resource saver mode, and responsive.
# ==============================================================================

echo "🚀 Starting Docker Desktop warm-up..."

# 1. Restart Docker Desktop using the preferred launch command
if command -v docker-desktop >/dev/null 2>&1; then
    echo "Stopping Docker Desktop via CLI..."
    docker desktop stop >/dev/null 2>&1
    sleep 5
fi

echo "Launching Docker Desktop (open -a Docker)..."
osascript -e 'quit app "Docker"' >/dev/null 2>&1
sleep 2
open -a Docker

# 2. Wait for the Docker daemon to be responsive
echo "Waiting for Docker daemon to initialize..."
MAX_ATTEMPTS=30
COUNT=0

while ! docker ps >/dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX_ATTEMPTS ]; then
        echo "❌ Error: Docker daemon failed to start within $((MAX_ATTEMPTS * 5)) seconds."
        exit 1
    fi
    echo "  - Attempt $COUNT/$MAX_ATTEMPTS: Daemon still starting..."
    sleep 5
done

echo "✅ Docker daemon is UP and responsive!"
docker version --format 'Engine Version: {{.Server.Version}}'
exit 0
