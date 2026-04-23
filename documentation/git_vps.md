
# Push to GitHub

git add .
git commit -m "documentation update"
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

Single Global Password: Instead of having individual user accounts (like luke.isham@gmail.com), the system uses a single, global admin password.
Environment Variable: If you look at admin/backend/auth_utils.py, the authentication simply checks the password entered on the login screen against an environment variable named ADMIN_PASSWORD (stored in your .env file).

What this means: You are the "primary root Admin" simply by virtue of knowing the password in the .env file (which defaults to "admin" if you haven't set one). There is no user registry tracking "lukeisham" vs. other admins. Anyone who knows that single password has full admin access.


# Future

1. get running on cloudflare
2. make live on domain (check cloudflare error messages)
3. log in
4. bulk upload
5. general test
6. Arbor test 
7. timeline test
8. Check that popular and Academic Challenges are seperated in practice and in documentatiopn 
9. Fill out donation portal
10. Function diagrams refinement 
11. Maps 
12. Ranking check
13. All discretionary text checked
14. Records filled out
15. Essays filled out
16. Promotion Bot (Social media)
17. SEO and Anyaltics 
18. Domain/Cloudflare 
19. Robot harvesting check
20. Documentation and Readme tidy up
21. Theology features :-) 