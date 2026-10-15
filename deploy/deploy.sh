#!/usr/bin/env bash
set -euo pipefail

# Genova Deployment Script for AWS EC2
# Usage: ./deploy/deploy.sh [branch]

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR/.."

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'claude/gifted-brahmagupta-a0jtkt')}"
echo "==> Updating branch: origin/$BRANCH..."
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "==> Building and restarting web container..."
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build --remove-orphans web

echo "==> Pruning dangling images..."
docker image prune -f

echo "==> Checking container status..."
docker compose -f deploy/docker-compose.yml ps

echo "==> Genova Web is deployed and connected to Cloudflare Tunnel!"
