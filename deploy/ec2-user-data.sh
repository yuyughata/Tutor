#!/usr/bin/env bash
# ==============================================================================
# AWS EC2 Cloud-Init User Data Script for Genova Web
# Fully automates Docker, Cloudflare Tunnel, and Nginx deployment.
# Works on Amazon Linux 2023 and Ubuntu 22.04 / 24.04 LTS.
# NO Elastic IP needed. NO inbound ports needed.
# ==============================================================================
set -euxo pipefail

# 1. Replace with your Cloudflare Tunnel Token and GitHub Repo
CLOUDFLARE_TUNNEL_TOKEN="REPLACE_WITH_YOUR_CLOUDFLARE_TUNNEL_TOKEN"
REPO_URL="https://github.com/yuyughata/Tutor.git"
BRANCH="main"
APP_DIR="/home/ubuntu/genova"

echo "==> Starting EC2 initialization..."

# 2. Detect OS and install Docker & Git
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS="unknown"
fi

if [[ "$OS" == "amzn" || "$OS" == "fedora" || "$OS" == "rhel" ]]; then
    echo "==> Installing packages for Amazon Linux..."
    dnf update -y
    dnf install -y docker git
    systemctl enable --now docker
    # Install docker compose plugin
    DOCKER_CONFIG=${DOCKER_CONFIG:-/usr/local/lib/docker}
    mkdir -p $DOCKER_CONFIG/cli-plugins
    curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m) -o $DOCKER_CONFIG/cli-plugins/docker-compose
    chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
elif [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
    echo "==> Installing packages for Ubuntu/Debian..."
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg git
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable --now docker
fi

# 3. Clone Repository
echo "==> Fetching application code..."
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    git fetch
    git checkout "$BRANCH"
    git pull
else
    git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
fi

# 4. Configure Environment
echo "==> Setting up environment variables..."
cat <<EOF > "$APP_DIR/deploy/.env"
CLOUDFLARE_TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
NEXT_PUBLIC_SUPABASE_URL=https://cjdrlddvbyfataumdztg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqZHJsZGR2YnlmYXRhdW1kenRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzA0MzcsImV4cCI6MjEwNzA0NjQzN30.SwnZqajinzmRx_6t2oWFlAAV-8v-u9URHImiB1DKhvA
NEXT_PUBLIC_SUPPORT_EMAIL=support@custar.com
EOF

# 5. Create Systemd Service for Auto-start on Reboot
cat <<EOF > /etc/systemd/system/genova.service
[Unit]
Description=Genova Web & Cloudflare Tunnel
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR/deploy
ExecStart=/usr/bin/docker compose -f $APP_DIR/deploy/docker-compose.yml --env-file $APP_DIR/deploy/.env up -d --build
ExecStop=/usr/bin/docker compose -f $APP_DIR/deploy/docker-compose.yml --env-file $APP_DIR/deploy/.env down

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now genova.service

echo "==> Genova Web and Cloudflare Tunnel started successfully!"
