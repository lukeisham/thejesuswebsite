# =============================================================================
#   THE JESUS WEBSITE — ROOT BUILD AUTOMATION
#   File:    build.py
#   Version: 1.1.0
#   Purpose: Triggers all backend pipelines and utility optimizations.
# =============================================================================

import os
import subprocess
import logging
from backend.middleware.logger_setup import setup_logger

# Initialize central logging to /logs
logger = setup_logger(__file__)

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

def run_script(script_path):
    if not os.path.exists(script_path):
        logger.warning(f"Script not found: {script_path}")
        return False
        
    logger.info(f"Executing: {os.path.basename(script_path)}...")
    result = subprocess.run(["python3", script_path], cwd=ROOT_DIR, capture_output=True, text=True)
    
    if result.returncode == 0:
        logger.info(f"Success: {os.path.basename(script_path)}")
        return True
    else:
        logger.error(f"Failed: {os.path.basename(script_path)}\n{result.stderr}")
        return False

def build_all():
    logger.info("Starting THE JESUS WEBSITE Master Build Context...")
    
    # Define ordered pipeline targets
    pipelines = [
        "backend/pipelines/pipeline_wikipedia.py",
        "backend/pipelines/pipeline_popular_challenges.py",
        "backend/pipelines/pipeline_academic_challenges.py",
        "backend/pipelines/pipeline_news.py"
    ]
    
    # Define optimization tools
    tools = [
        "tools/minify_admin.py",
        "tools/generate_sitemap.py"
    ]
    
    logger.info("--- 1. RUNNING PIPELINES ---")
    for script in pipelines:
        run_script(os.path.join(ROOT_DIR, script))
        
    logger.info("--- 2. RUNNING OPTIMIZATION TOOLS ---")
    for script in tools:
        run_script(os.path.join(ROOT_DIR, script))
        
    logger.info("Master Build Context finished successfully.")

if __name__ == "__main__":
    build_all()
