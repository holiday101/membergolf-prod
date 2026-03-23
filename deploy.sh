#!/bin/bash
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────
SSH_HOST="ubuntu@54.226.186.201"       # membergolfonline.com
SSH_KEY="~/.ssh/my-ec2-key.pem"
REMOTE_DIR="/home/ubuntu/membergolf-prod"
IMAGE_NAME="golfapp"
CONTAINER_NAME="golfapp"
PORT="4000"

# ── Deploy ─────────────────────────────────────────────────────
echo "🚀 Deploying to $SSH_HOST..."

ssh -i "$SSH_KEY" "$SSH_HOST" << 'ENDSSH'
set -euo pipefail

cd /home/ubuntu/membergolf-prod

echo "── Pulling latest code..."
git pull origin main

echo "── Building Docker image..."
docker build -t golfapp -f server/Dockerfile .

echo "── Stopping old container (if running)..."
docker stop golfapp 2>/dev/null || true
docker rm golfapp 2>/dev/null || true

echo "── Starting new container..."
docker run -d \
  --name golfapp \
  --restart unless-stopped \
  -p 4000:4000 \
  --env-file .env \
  golfapp

echo "── Cleaning up old images..."
docker image prune -f

echo "✅ Deploy complete!"
docker ps --filter name=golfapp
ENDSSH
