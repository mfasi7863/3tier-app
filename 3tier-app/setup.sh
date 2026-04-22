#!/bin/bash
# One-click EC2 server bootstrap script.
# Run this once on a fresh Ubuntu 22.04 EC2 instance.
#
# Usage: chmod +x setup.sh && ./setup.sh

set -e

echo "=============================================="
echo " EC2 Server Setup — 3-Tier App"
echo "=============================================="

echo ""
echo ">>> [1/5] Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

echo ""
echo ">>> [2/5] Installing dependencies..."
sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  unzip \
  python3 \
  git

echo ""
echo ">>> [3/5] Installing Docker..."
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update -y
sudo apt-get install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-compose-plugin

# Allow ubuntu user to run docker without sudo
sudo usermod -aG docker ubuntu
echo "✅ Docker installed"

echo ""
echo ">>> [4/5] Installing AWS CLI v2..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" \
  -o "/tmp/awscliv2.zip"
unzip -q /tmp/awscliv2.zip -d /tmp/
sudo /tmp/aws/install
rm -rf /tmp/awscliv2.zip /tmp/aws/
echo "✅ AWS CLI installed"

echo ""
echo ">>> [5/5] Verifying installations..."
echo "   Docker  : $(docker --version)"
echo "   Compose : $(docker compose version)"
echo "   AWS CLI : $(aws --version)"
echo "   Git     : $(git --version)"
echo "   Python3 : $(python3 --version)"

echo ""
echo "=============================================="
echo " ✅ Setup Complete!"
echo " ⚠️  IMPORTANT: Log out and log back in for"
echo "    Docker group permissions to take effect."
echo "    Run: exit"
echo "    Then SSH back in."
echo "=============================================="