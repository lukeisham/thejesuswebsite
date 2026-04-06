
# Push to GitHub

git add .
git commit -m "Finalizing codebase and documentation audit v1.0"
git push origin main

# Pull from GitHub into Server

cd /var/www/thejesuswebsite
git pull origin main

# Recommended: Use the pre-built deployment script
bash deployment/deploy.sh

# To do

* Automate the process of pushing and pulling from github to the server (Use `deployment/deploy.sh`)
* Add ESV and Deepseek and Admin passwords to .env

# VPS IP

72.60.197.13