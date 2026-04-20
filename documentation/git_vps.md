
# Push to GitHub

git add .
git commit -m "style update"
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

## Back to the server on Monday

# 1. Go to your project folder
cd /var/www/thejesuswebsite

# 2. Re-enter your Python "bubble"
source venv/bin/activate

# 3. Check if the heart is still beating (Status check)
sudo systemctl status thejesuswebsite

# Logs
sudo journalctl -u thejesuswebsite -f
# Nginx status
sudo systemctl status nginx
# Restart
sudo systemctl restart thejesuswebsite
sudo systemctl restart nginx


# Next actions

Refractor /Users/lukeishammacbookair/Developer/thejesuswebsite/documentation/guides/guide_function.md so its function diagrams match the module numbering of /Users/lukeishammacbookair/Developer/thejesuswebsite/documentation/guides/guide_appearance.md and /Users/lukeishammacbookair/Developer/thejesuswebsite/documentation/module_sitemap.md

Then add the 'Truth through typography' section to the function guide and module_sitemap.md

Then review the functionality in the function guide of 'Truth through typography'.

Make the buttons borders grey instead of black and the font less bold, slightly smaller and greyer