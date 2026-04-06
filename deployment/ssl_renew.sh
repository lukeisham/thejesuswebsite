#!/bin/bash
# =============================================================================
#   THE JESUS WEBSITE — SSL RENEWAL AUTOMATION
#   File:    deployment/ssl_renew.sh
#   Version: 1.1.0
#   Purpose: Certbot pre-hook wrapper to execute safely on cron jobs.
# =============================================================================

# This script is intended to be executed universally via crontab:
# 0 3 * * * /var/www/thejesuswebsite/deployment/ssl_renew.sh >> /var/log/ssl_renew.log 2>&1

echo "====================================="
echo " Starting SSL Renewal - $(date)"

# Use certbot to natively manage renewal
# Requires Certbot package pre-installed
/usr/bin/certbot renew --quiet --post-hook "systemctl reload nginx"

if [ $? -eq 0 ]; then
    echo " Cert renewal logic executed successfully."
else
    echo " Cert renewal encountered an error!"
fi
echo "====================================="
