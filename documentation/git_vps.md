
# Push to GitHub

git add .
git commit -m "UI consistency update"
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

Create a plan to add an Admin button to the bottom of the Sidebar that takes a user to the Dashboard. Reference Module 1.5 and Module 6.1 The plan should contain bite-sized tasks, that have checkboxes for completion and a final audit stage. 

Then add the 'Truth through typography' section to the function guide and module_sitemap.md

Then review the functionality in the function guide of 'Truth through typography'.

Make the buttons borders grey instead of black and the font less bold, slightly smaller and greyer