# =============================================================================
#   THE JESUS WEBSITE — SECURITY BASELINE AUDIT
#   File:    tests/security_audit.py
#   Version: 1.1.0
#   Purpose: Automated vulnerability scans for .env leaks and header validation.
# =============================================================================

import os
import logging
import sys

# Ensure package context is recognized when running directly from CLI
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.middleware.logger_setup import setup_logger

# Initialize central logging for tests
logger = setup_logger(__file__, is_test=True)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def audit_directory_structure():
    """
    Verifies that critical security assets are correctly located and protected.
    """
    logger.info("Target: Directory Structure Audit...")
    
    vulnerabilities = []
    
    # Check if .env is exposed in a public-servable directory (frontend/pages)
    public_env = os.path.join(ROOT_DIR, "frontend", "pages", ".env")
    if os.path.exists(public_env):
        vulnerabilities.append("SECURITY CRITICAL: .env file found in public frontend directory!")
    
    # Check for .git directory exposure (if this was a raw server deployment)
    git_dir = os.path.join(ROOT_DIR, "frontend", "pages", ".git")
    if os.path.exists(git_dir):
        vulnerabilities.append("SECURITY CRITICAL: .git metadata found in public frontend directory!")
    
    if not vulnerabilities:
        logger.info("Check PASSED: No immediate public asset exposure detected.")
        return True
    else:
        for v in vulnerabilities:
            logger.error(v)
        return False

def audit_api_endpoints():
    """
    Validates that the admin_api script requires token-verification dependencies.
    """
    logger.info("Target: API Endpoint Logic Audit...")
    api_path = os.path.join(ROOT_DIR, "admin", "backend", "admin_api.py")
    
    if not os.path.exists(api_path):
        logger.warning("Admin API script missing. Skipping logic audit.")
        return False
        
    with open(api_path, 'r') as f:
        content = f.read()
        
    # Check for presence of Depends(verify_token) baseline protection
    if "Depends(verify_token)" in content:
        logger.info("Check PASSED: Admin endpoints appear protected by JWT dependency.")
        return True
    else:
        logger.error("SECURITY CRITICAL: Admin endpoints may be exposing data without verify_token protection!")
        return False

def run_audit():
    logger.info("Initializing System Security Baseline Scan...")
    
    s1 = audit_directory_structure()
    s2 = audit_api_endpoints()
    
    if s1 and s2:
        logger.info("System Security Audit: STABLE.")
    else:
        logger.error("System Security Audit: VULNERABILITIES DETECTED.")

if __name__ == "__main__":
    run_audit()
