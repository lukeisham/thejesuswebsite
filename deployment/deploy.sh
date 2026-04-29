#!/bin/bash
# =============================================================================
#   THE JESUS WEBSITE — DEPLOYMENT SCRIPT
#   File:    deployment/deploy.sh
#   Version: 1.1.1
#   Purpose: Automated pull, environment sync, and systemd restart.
# =============================================================================

set -e

# Target branch and directory
BRANCH="main"
DEPLOY_DIR="/var/www/thejesuswebsite"

echo "============================================================"
echo " Starting The Jesus Website Deployment - $(date)"
echo "============================================================"

# Navigate to deployment directory
cd $DEPLOY_DIR

# 1. Pull Latest Source from GitHub
echo ">>> Pulling latest source code from origin/$BRANCH..."
git fetch origin $BRANCH
git reset --hard origin/$BRANCH

# 2. Update Python Dependencies
echo ">>> Checking Virtual Environment and Dependencies..."
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt

# 3. Clean and optimize frontend
# TODO: uncomment once Task 31 (build pipelines) is implemented
# python3 build.py

# 4. Sync and restart Systemd service
echo ">>> Syncing Systemd Service..."
sudo cp $DEPLOY_DIR/deployment/thejesuswebsite.service /etc/systemd/system/thejesuswebsite.service
sudo systemctl daemon-reload

echo ">>> Restarting Systemd Services..."
sudo systemctl restart thejesuswebsite.service

# 5. Sync and reload Nginx
echo ">>> Syncing Nginx Configuration..."
sudo cp $DEPLOY_DIR/nginx.conf /etc/nginx/sites-available/thejesuswebsite
sudo ln -sf /etc/nginx/sites-available/thejesuswebsite /etc/nginx/sites-enabled/thejesuswebsite

echo ">>> Reloading Nginx Configuration..."
sudo nginx -t && sudo systemctl reload nginx

echo "============================================================"
echo " Deployment Successful! "
echo "============================================================"