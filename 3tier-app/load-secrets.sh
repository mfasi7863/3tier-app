#!/bin/bash
# Fetch secrets from AWS Secrets Manager and run Docker Compose securely

set -euo pipefail

SECRET_NAME="${SECRET_NAME:-3tier-app/db-credentials}"
AWS_REGION="${AWS_REGION:-ap-south-1}"

echo "=============================================="
echo " 3-Tier App — Deployment with Secrets Manager"
echo "=============================================="
echo ""
echo ">>> Checking required dependencies..."

# Dependency checks
command -v aws >/dev/null || { echo "❌ aws CLI not installed"; exit 1; }
command -v python3 >/dev/null || { echo "❌ python3 not installed"; exit 1; }
command -v docker >/dev/null || { echo "❌ docker not installed"; exit 1; }

echo ">>> Fetching secrets from AWS Secrets Manager..."

SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id "$SECRET_NAME" \
  --region "$AWS_REGION" \
  --query SecretString \
  --output text)

if [ -z "$SECRET_JSON" ]; then
  echo "❌ ERROR: Failed to retrieve secret."
  echo "   Check that:"
  echo "   1. IAM Role is attached to EC2"
  echo "   2. Secret '$SECRET_NAME' exists in region '$AWS_REGION'"
  exit 1
fi

# Parse JSON using python
export MYSQL_ROOT_PASSWORD=$(echo "$SECRET_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['MYSQL_ROOT_PASSWORD'])")
export MYSQL_DATABASE=$(echo "$SECRET_JSON"       | python3 -c "import sys,json; print(json.load(sys.stdin)['MYSQL_DATABASE'])")
export MYSQL_USER=$(echo "$SECRET_JSON"           | python3 -c "import sys,json; print(json.load(sys.stdin)['MYSQL_USER'])")
export MYSQL_PASSWORD=$(echo "$SECRET_JSON"       | python3 -c "import sys,json; print(json.load(sys.stdin)['MYSQL_PASSWORD'])")

echo ">>> Detecting EC2 Public IP (IMDSv2)..."

# IMDSv2 token
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
-H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

EC2_PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
http://169.254.169.254/latest/meta-data/public-ipv4 || echo "N/A")

export EC2_PUBLIC_IP
export AWS_REGION
export SECRET_NAME

echo "✅ Secrets loaded successfully"
echo "✅ EC2 Public IP: $EC2_PUBLIC_IP"
echo ""
echo ">>> Starting containers with Docker Compose..."
echo ""

docker compose up --build -d

echo ""
echo ">>> Clearing secrets from environment..."

unset MYSQL_ROOT_PASSWORD MYSQL_PASSWORD MYSQL_DATABASE MYSQL_USER SECRET_JSON

echo ""
echo "=============================================="
echo " ✅ Deployment Complete!"
echo "=============================================="
echo " 🌐 Frontend : http://$EC2_PUBLIC_IP"
echo " 🔧 API Health: http://$EC2_PUBLIC_IP:3000/api/health"
echo " 📋 API Users : http://$EC2_PUBLIC_IP:3000/api/users"
echo "=============================================="