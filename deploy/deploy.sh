#!/usr/bin/env bash
set -euo pipefail

# Genova Deployment Script for AWS EC2
# Usage: ./deploy/deploy.sh

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR/.."

echo "==> Pulling latest changes from git..."
git pull --ff-only || echo "Note: git pull skipped or failed, using local files"

echo "==> Building and restarting containers..."
docker compose -f deploy/docker-compose.yml up -d --build --remove-orphans

echo "==> Pruning dangling images..."
docker image prune -f

echo "==> Checking container status..."
docker compose -f deploy/docker-compose.yml ps

echo "==> Genova Web is deployed and connected to Cloudflare Tunnel!"
