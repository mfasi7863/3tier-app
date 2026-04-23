<div align="center">

# 🚀 CloudStack3

### Dockerized 3-Tier Web Application on AWS EC2 with Secrets Manager

[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18_Alpine-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![AWS EC2](https://img.shields.io/badge/AWS-EC2-FF9900?style=for-the-badge&logo=amazonec2&logoColor=white)](https://aws.amazon.com/ec2/)
[![AWS Secrets Manager](https://img.shields.io/badge/AWS-Secrets_Manager-DD344C?style=for-the-badge&logo=amazondynamodb&logoColor=white)](https://aws.amazon.com/secrets-manager/)

A **production-ready**, fully containerized 3-tier web application deployed on AWS EC2.  
Secrets are managed securely via **AWS Secrets Manager** — zero hardcoded credentials anywhere.

[Live Demo](#-live-endpoints) · [Architecture](#-architecture) · [Deployment Guide](#-deployment-guide) · [Issues & Fixes](#-issues--resolutions)

</div>

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Security — How Secrets Work](#-security--how-secrets-work)
- [EC2 Cost Breakdown](#-ec2-cost-breakdown)
- [Prerequisites](#-prerequisites)
- [Deployment Guide](#-deployment-guide)
  - [Phase 1: Local Setup](#phase-1--local-setup)
  - [Phase 2: Push to GitHub](#phase-2--push-to-github)
  - [Phase 3: AWS Setup](#phase-3--aws-setup)
  - [Phase 4: EC2 Bootstrap](#phase-4--ec2-bootstrap)
  - [Phase 5: Deploy](#phase-5--deploy)
  - [Phase 6: Verify](#phase-6--verify)
- [API Reference](#-api-reference)
- [Issues & Resolutions](#-issues--resolutions)
- [Useful Commands](#-useful-commands)
- [Future Improvements](#-future-improvements)

---

## 📖 Overview

**CloudStack3** is a full-stack 3-tier web application built with React, Node.js, and MySQL — containerized with Docker Compose and deployed on a single AWS EC2 instance.

The project demonstrates **real-world DevOps practices**:

- ✅ Zero hardcoded credentials — secrets fetched at runtime from **AWS Secrets Manager**
- ✅ EC2 **IAM Role** used for authentication — no AWS access keys stored anywhere
- ✅ All containers auto-restart on EC2 reboot (`restart: always`)
- ✅ **Multi-stage Docker builds** for lean, optimized images
- ✅ Nginx reverse proxy routing `/api` requests to Node.js backend
- ✅ Backend **health check endpoint** with real-time DB connectivity status
- ✅ Full **CRUD** on a users table (Create, Read, Delete)
- ✅ Secrets **cleared from shell** immediately after containers start

---

## 🏗 Architecture

```
                          INTERNET
                              │
                   ┌──────────▼──────────┐
                   │     EC2 Instance     │
                   │  Ubuntu 22.04 LTS    │
                   │   (us-east-1)        │
                   │                      │
                   │  ┌────────────────┐  │
         Port 80 ──►  │  Nginx + React  │  │  ← Frontend Container
                   │  └───────┬────────┘  │
                   │          │ /api      │
                   │  ┌───────▼────────┐  │
        Port 3000 ──► │ Node.js/Express│  │  ← Backend Container
                   │  └───────┬────────┘  │
                   │          │           │
                   │  ┌───────▼────────┐  │
                   │  │   MySQL 8.0    │  │  ← Database Container
                   │  │ (internal only)│  │     (port 3306, not exposed)
                   │  └────────────────┘  │
                   │                      │
                   │  Docker Bridge Net   │
                   │  app-network         │
                   └──────────────────────┘
                              │
                    IAM Role (no keys)
                              │
                              ▼
                   ┌──────────────────────┐
                   │  AWS Secrets Manager  │
                   │  us-east-1            │
                   │  3tier-app/db-creds   │
                   └──────────────────────┘
```

All three containers communicate over a private Docker bridge network (`app-network`).  
MySQL is **never exposed** to the internet — only ports `80` and `3000` are open.

---

## 🛠 Tech Stack

| Layer | Technology | Version | Exposed Port |
|---|---|---|---|
| Frontend | React.js + Nginx | React 18.2 / Nginx Alpine | `80` |
| Backend | Node.js + Express | Node 18 Alpine | `3000` |
| Database | MySQL | 8.0 | `3306` (internal only) |
| Containerization | Docker + Docker Compose | Latest | — |
| Secret Management | AWS Secrets Manager | — | — |
| Auth Method | EC2 IAM Role (no keys) | — | — |
| Server OS | Ubuntu Server | 22.04 LTS | — |
| AWS Region | us-east-1 (N. Virginia) | — | — |

---

## 📁 Project Structure

```
3tier-app/
├── backend/
│   ├── src/
│   │   └── server.js              # Express API + AWS Secrets Manager integration
│   ├── package.json               # Dependencies incl. @aws-sdk/client-secrets-manager
│   ├── Dockerfile                 # Multi-stage build (node:18-alpine)
│   └── .dockerignore
├── frontend/
│   ├── src/
│   │   ├── index.js               # React entry point
│   │   ├── App.js                 # Main UI component (CRUD)
│   │   └── App.css                # Styling
│   ├── public/
│   │   └── index.html             # HTML shell
│   ├── package.json
│   ├── nginx.conf                 # Nginx config + /api reverse proxy
│   ├── Dockerfile                 # Multi-stage: Node build → Nginx serve
│   └── .dockerignore
├── docker-compose.yml             # Orchestrates all 3 containers, no hardcoded secrets
├── iam-policy.json                # IAM policy granting EC2 Secrets Manager access
├── load-secrets.sh                # Fetches secrets → starts Docker Compose
├── setup.sh                       # EC2 bootstrap: Docker + AWS CLI + Git
└── .gitignore                     # Prevents secrets from being committed
```

---

## 🔐 Security — How Secrets Work

This project uses **AWS Secrets Manager** with an **EC2 IAM Role** — the most secure approach for EC2 deployments. No passwords are ever stored on disk, in Git, or in Docker images.

```
┌─────────────────────────────────────────────────────────┐
│                   Secret Lifecycle                       │
├─────────────────┬───────────────────────────────────────┤
│ AWS Secrets Mgr │ Encrypted at rest (KMS)           ✅  │
│ EC2 RAM         │ Temporary shell env var only       ✅  │
│ Docker container│ Passed via compose, in memory      ✅  │
│ On disk (EC2)   │ Never written                      ✅  │
│ Git / GitHub    │ Never committed (.gitignore)       ✅  │
│ Docker image    │ Never baked in                     ✅  │
└─────────────────┴───────────────────────────────────────┘
```

### Secret Flow

```
AWS Secrets Manager
        │
        │  (EC2 IAM Role — no access keys needed)
        ▼
load-secrets.sh  →  exports to shell env  →  docker compose up
                                                      │
                                          ┌───────────┴────────────┐
                                          ▼                        ▼
                                   mysql container          backend container
                                   (receives creds)     (Node.js SDK fetches
                                                          secrets again at
                                                          runtime directly)
```

After containers start, **secrets are immediately unset from the shell**.

---

## 💰 EC2 Cost Breakdown

| Instance | vCPU | RAM | On-Demand/mo | Reserved 1-Yr/mo | Recommended For |
|---|---|---|---|---|---|
| t3.micro | 2 | 1 GB | ~$7.60 | ~$4.50 | Free tier testing |
| **t3.small** ⭐ | **2** | **2 GB** | **~$15.18** | **~$9.50** | **This project** |
| t3.medium | 2 | 4 GB | ~$30.37 | ~$17.75 | Small production |
| t3.large | 2 | 8 GB | ~$60.74 | ~$35.50 | Medium production |

**Additional costs (us-east-1):**
| Resource | Monthly Cost |
|---|---|
| EBS gp3 (20 GB) | ~$1.60 |
| Elastic IP (attached) | Free |
| Data Transfer out (first 100 GB) | Free |
| AWS Secrets Manager | ~$0.40/secret |

---

## ✅ Prerequisites

Before you begin, ensure you have the following:

- [ ] **AWS Account** with CLI configured (`aws configure`)
- [ ] **GitHub Account** with a new private repository created
- [ ] **Node.js** installed locally (to generate `package-lock.json`)
- [ ] **Docker Desktop** installed locally (optional, for local testing)
- [ ] **EC2 Key Pair** (`.pem` file) downloaded
- [ ] **EC2 Instance** — Ubuntu 22.04 LTS, t3.small, 20 GB gp3

**EC2 Security Group Inbound Rules:**

| Type | Port | Source |
|---|---|---|
| SSH | 22 | My IP only |
| HTTP | 80 | 0.0.0.0/0 |
| Custom TCP | 3000 | 0.0.0.0/0 |

---

## 🚀 Deployment Guide

### Phase 1 — Local Setup

```bash
# Create project structure
mkdir 3tier-app && cd 3tier-app
mkdir -p backend/src frontend/src frontend/public

# Create all files
touch backend/src/server.js backend/package.json backend/Dockerfile backend/.dockerignore
touch frontend/src/index.js frontend/src/App.js frontend/src/App.css
touch frontend/public/index.html frontend/package.json
touch frontend/nginx.conf frontend/Dockerfile frontend/.dockerignore
touch docker-compose.yml iam-policy.json load-secrets.sh setup.sh .gitignore

# Make scripts executable
chmod +x load-secrets.sh setup.sh

# Open in VS Code and populate all files
code .
```

> ⚠️ **Important:** After populating `package.json` files, run `npm install` in both `backend/` and `frontend/` directories to generate `package-lock.json` files.

```bash
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

---

### Phase 2 — Push to GitHub

```bash
git init
git add .

# Verify no secrets appear in staging
git status

git commit -m "Initial commit: CloudStack3 — 3-tier app with AWS Secrets Manager"
git remote add origin https://github.com/YOUR_USERNAME/3tier-app.git
git branch -M main
git push -u origin main
```

> 🔒 Create the repository as **Private** — it contains infrastructure configuration.

---

### Phase 3 — AWS Setup

Run these from your **local machine**:

#### 3a. Store Secret in AWS Secrets Manager

```bash
aws secretsmanager create-secret \
  --name "3tier-app/db-credentials" \
  --region us-east-1 \
  --secret-string '{
    "MYSQL_ROOT_PASSWORD": "YourStrongRootPass!2026",
    "MYSQL_DATABASE":      "myapp",
    "MYSQL_USER":          "appuser",
    "MYSQL_PASSWORD":      "YourStrongAppPass!2026"
  }'
```

> 📋 Copy the returned ARN — you'll need it for `iam-policy.json`. Replace `YOUR_ACCOUNT_ID` in the file with your 12-digit AWS account ID.

#### 3b. Create IAM Role & Attach Policy

```bash
# Create role
aws iam create-role \
  --role-name EC2SecretsManagerRole \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{
      "Effect":"Allow",
      "Principal":{"Service":"ec2.amazonaws.com"},
      "Action":"sts:AssumeRole"
    }]
  }'

# Attach permission policy
aws iam put-role-policy \
  --role-name EC2SecretsManagerRole \
  --policy-name SecretsManagerAccess \
  --policy-document file://iam-policy.json

# Create instance profile and attach role
aws iam create-instance-profile --instance-profile-name EC2SecretsManagerProfile
aws iam add-role-to-instance-profile \
  --instance-profile-name EC2SecretsManagerProfile \
  --role-name EC2SecretsManagerRole
```

#### 3c. Attach IAM Profile to EC2

**AWS Console → EC2 → Instances → Select Instance → Actions → Security → Modify IAM Role → Select `EC2SecretsManagerProfile`**

---

### Phase 4 — EC2 Bootstrap

```bash
# SSH into EC2
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

Since `setup.sh` lives inside the repo (not cloned yet), create it directly with vim:

```bash
vim setup.sh
# Press i → paste setup.sh contents → Esc → :wq → Enter

chmod +x setup.sh && ./setup.sh
```

> ⚠️ After setup completes, **log out and log back in** for the Docker group permission to take effect:
```bash
exit
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

Verify tools installed correctly:
```bash
docker --version
docker compose version
aws --version
```

---

### Phase 5 — Deploy

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/3tier-app.git
cd 3tier-app

# Verify IAM role can access secrets (should return JSON)
aws secretsmanager get-secret-value \
  --secret-id "3tier-app/db-credentials" \
  --region us-east-1 \
  --query SecretString \
  --output text

# Launch all containers
chmod +x load-secrets.sh
export SECRET_NAME="3tier-app/db-credentials"
export AWS_REGION="us-east-1"
./load-secrets.sh
```

**Expected output:**
```
==============================================
 3-Tier App — Deployment with Secrets Manager
==============================================
>>> Fetching secrets from AWS Secrets Manager...
✅ Secrets loaded successfully
✅ EC2 Public IP: xx.xx.xx.xx
>>> Starting containers with Docker Compose...
 ✔ Container mysql     Healthy
 ✔ Container backend   Started
 ✔ Container frontend  Started
>>> Clearing secrets from environment...
✅ Deployment Complete!
🌐 Frontend:  http://xx.xx.xx.xx
🔑 API Health: http://xx.xx.xx.xx:3000/api/health
📋 API Users:  http://xx.xx.xx.xx:3000/api/users
```

---

### Phase 6 — Verify

```bash
# All 3 containers should show "Up"
docker compose ps

# Backend health check
curl http://localhost:3000/api/health
# Expected: {"status":"healthy","database":"connected","timestamp":"..."}

# Verify secrets were fetched correctly
docker compose logs backend | grep -E "✅|❌"
# Expected: ✅ Secrets fetched from AWS Secrets Manager
#           ✅ Database connected successfully
#           ✅ Database initialized

# Open in browser
echo "App URL: http://$(curl -s http://checkip.amazonaws.com)"
```

---

## 📡 API Reference

Base URL: `http://<EC2_PUBLIC_IP>:3000`

| Method | Endpoint | Description | Request Body |
|---|---|---|---|
| `GET` | `/api/health` | Health check — backend + DB status | None |
| `GET` | `/api/users` | Fetch all users | None |
| `POST` | `/api/users` | Create a new user | `{ "name": "...", "email": "..." }` |
| `DELETE` | `/api/users/:id` | Delete a user by ID | None |

### Example Requests

```bash
# Health check
curl http://localhost:3000/api/health

# Get all users
curl http://localhost:3000/api/users

# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Fasiuddin","email":"fasi@example.com"}'

# Delete a user
curl -X DELETE http://localhost:3000/api/users/1
```

### Example Responses

```json
// GET /api/health
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-04-23T12:38:58.382Z"
}

// GET /api/users
{
  "success": true,
  "data": [
    { "id": 2, "name": "Mohammed", "email": "abc@yahoo.com", "created_at": "2026-04-23T12:38:46.000Z" },
    { "id": 1, "name": "Fasi",     "email": "xyz@gmail.com", "created_at": "2026-04-23T12:38:32.000Z" }
  ]
}
```

---

## 🐛 Issues & Resolutions

All issues encountered and resolved during deployment:

| # | Issue | Root Cause | Fix |
|---|---|---|---|
| 1 | `setup.sh: No such file or directory` | Ran before cloning repo — chicken-and-egg problem | Created `setup.sh` directly on EC2 via vim |
| 2 | `npm ci` fails — missing `package-lock.json` | Files created manually, `npm install` never run | Changed to `npm install` in Dockerfiles; permanent fix: run `npm install` locally and commit lock files |
| 3 | React build fails — `index.js` not found | `frontend/src/index.js` missing from initial file list | Created the React entry point file via vim on EC2 |
| 4 | `AccessDeniedException` from Secrets Manager | IAM Role created but permission policy never attached | Added inline policy via AWS Console → IAM → Roles |
| 5 | Docker Compose `version` attribute warning | `version: '3.8'` obsolete in Docker Compose v2+ | Removed the `version` key from `docker-compose.yml` |

---

## 🔧 Useful Commands

```bash
# ── Container Management ──────────────────────────────────
docker compose ps                    # View all container statuses
docker compose logs backend          # View backend logs
docker compose logs -f backend       # Follow live backend logs
docker compose logs mysql            # View MySQL logs
docker compose restart backend       # Restart a single container
docker compose down                  # Stop all containers
docker compose down -v               # Stop + delete volumes (⚠️ deletes DB data)

# ── Redeploy After Code Changes ───────────────────────────
git pull origin main
export SECRET_NAME="3tier-app/db-credentials"
export AWS_REGION="us-east-1"
./load-secrets.sh

# ── Database Access ───────────────────────────────────────
docker exec -it mysql mysql -u appuser -p myapp
# Inside MySQL:
SHOW TABLES;
SELECT * FROM users;

# ── Health Check ──────────────────────────────────────────
curl http://localhost:3000/api/health
curl http://localhost:3000/api/users

# ── EC2 Info ─────────────────────────────────────────────
curl http://checkip.amazonaws.com    # Get public IP
```

---

## 🔄 Future Improvements

- [ ] Add **HTTPS / SSL** with Let's Encrypt + Certbot
- [ ] Set up a **custom domain** with Route 53
- [ ] Add **CI/CD pipeline** with GitHub Actions (auto-deploy on push)
- [ ] Migrate to **AWS RDS** for managed MySQL with automated backups
- [ ] Add **auto-scaling** with AWS Auto Scaling Groups
- [ ] Implement **JWT authentication** on the API
- [ ] Add **Prometheus + Grafana** monitoring stack
- [ ] Write **unit and integration tests**
- [ ] Push Docker images to **Amazon ECR** for versioned deployments

---

## 📄 License

This project is licensed under the MIT License.

---

<div align="center">

**Built and deployed by [Mohd Fasiuddin](https://github.com/YOUR_USERNAME)**

*CloudStack3 — April 2026 | AWS us-east-1*

</div>
