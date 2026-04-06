# =============================================================================
#   THE JESUS WEBSITE — SEO SITEMAP GENERATOR
#   File:    tools/generate_sitemap.py
#   Version: 1.1.0
#   Purpose: Queries SQLite to dynamically build an XML sitemap for search engines.
# =============================================================================

import os
import sqlite3
import datetime
import logging
import sys

# Ensure package context is recognized when running directly from CLI
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.middleware.logger_setup import setup_logger

# Initialize central logging to /logs
logger = setup_logger(__file__)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT_DIR, 'database', 'database.sqlite')
SITEMAP_OUTPUT_PATH = os.path.join(ROOT_DIR, 'frontend', 'pages', 'sitemap.xml')
BASE_URL = "https://www.thejesuswebsite.com"

def generate_sitemap():
    """
    Trigger:  Run directly via CLI or via build.py.
    Function: Reads all records slugs from SQLite and writes a standards-compliant
              XML sitemap to frontend/pages/sitemap.xml.
    Output:   sitemap.xml at SITEMAP_OUTPUT_PATH, combining static routes and record URLs.
    """
    logger.info("Starting internal XML Sitemap Generator...")
    
    if not os.path.exists(DB_PATH):
        logger.error("Database not found. Generating static sitemap only.")
        records = []
    else:
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT slug, updated_at FROM records WHERE slug IS NOT NULL")
            records = [dict(row) for row in cursor.fetchall()]
            conn.close()
        except sqlite3.OperationalError as e:
            logger.error(f"Cannot access records table: {str(e)}")
            records = []
    
    # Boilerplate XML setup
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    # 1. Manually add critical landing pages representing the main SPA routing framework
    static_routes = [
        ("/", "1.0", "daily"),
        ("/about.html", "0.8", "monthly"),
        ("/context.html", "0.9", "weekly"),
        ("/debate.html", "0.9", "weekly"),
        ("/resources.html", "0.9", "weekly"),
    ]
    
    today = datetime.datetime.utcnow().strftime('%Y-%m-%d')
    for route, priority, freq in static_routes:
        xml_content += f"  <url>\n"
        xml_content += f"    <loc>{BASE_URL}{route}</loc>\n"
        xml_content += f"    <lastmod>{today}</lastmod>\n"
        xml_content += f"    <changefreq>{freq}</changefreq>\n"
        xml_content += f"    <priority>{priority}</priority>\n"
        xml_content += f"  </url>\n"

    # 2. Append dynamically built Records directly driving semantic traffic
    for record in records:
        slug = record.get('slug')
        raw_updated = record.get('updated_at')
        
        # Use DB updated_at or fallback dynamically to 'today'
        last_mod = raw_updated.split('T')[0] if raw_updated else today
        
        xml_content += f"  <url>\n"
        xml_content += f"    <loc>{BASE_URL}/record.html?id={slug}</loc>\n"
        xml_content += f"    <lastmod>{last_mod}</lastmod>\n"
        xml_content += f"    <changefreq>monthly</changefreq>\n"
        xml_content += f"    <priority>0.7</priority>\n"
        xml_content += f"  </url>\n"
        
    xml_content += '</urlset>\n'
    
    # Ensure nested frontend/pages architecture is correctly scaffolded
    os.makedirs(os.path.dirname(SITEMAP_OUTPUT_PATH), exist_ok=True)
    with open(SITEMAP_OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write(xml_content)
        
    logger.info(f"Sitemap explicitly generated to: {SITEMAP_OUTPUT_PATH}")

if __name__ == "__main__":
    generate_sitemap()
