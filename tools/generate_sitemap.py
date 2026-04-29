# =============================================================================
#   THE JESUS WEBSITE — SEO SITEMAP GENERATOR
#   File:    tools/generate_sitemap.py
#   Version: 1.2.0
#   Purpose: Queries SQLite to dynamically build an XML sitemap for search engines.
#            Updated for URL slug restructure — uses clean paths instead of
#            raw .html filenames, and path-based record slugs.
# =============================================================================

import datetime
import logging
import os
import sqlite3
import sys

# Ensure package context is recognized when running directly from CLI
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.middleware.logger_setup import setup_logger

# Initialize central logging to /logs
logger = setup_logger(__file__)

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT_DIR, "database", "database.sqlite")
SITEMAP_OUTPUT_PATH = os.path.join(ROOT_DIR, "frontend", "pages", "sitemap.xml")
BASE_URL = "https://www.thejesuswebsite.com"


def generate_sitemap():
    """
    Trigger:  Run directly via CLI or via build.py.
    Function: Reads all records slugs from SQLite and writes a standards-compliant
              XML sitemap to frontend/pages/sitemap.xml.
    Output:   sitemap.xml at SITEMAP_OUTPUT_PATH, combining static routes,
              record deep-dive URLs, and blog post URLs.
    """
    logger.info("Starting internal XML Sitemap Generator...")

    if not os.path.exists(DB_PATH):
        logger.error("Database not found. Generating static sitemap only.")
        records = []
        blog_posts = []
    else:
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()

            # Fetch all records with slugs for record deep-dive pages
            cursor.execute(
                "SELECT slug, updated_at FROM records WHERE slug IS NOT NULL"
            )
            records = [dict(row) for row in cursor.fetchall()]

            # Fetch records that have blogpost content for individual blog post pages
            # Uses the `blogposts` TEXT column on the records table (JSON blob).
            # Gracefully handles the case where the column does not yet exist.
            try:
                cursor.execute(
                    "SELECT slug, updated_at FROM records WHERE blogposts IS NOT NULL AND blogposts != ''"
                )
                blog_posts = [dict(row) for row in cursor.fetchall()]
            except sqlite3.OperationalError:
                logger.info("blogposts column not found — skipping blog post URLs.")
                blog_posts = []

            conn.close()
        except sqlite3.OperationalError as e:
            logger.error(f"Cannot access records table: {str(e)}")
            records = []
            blog_posts = []

    # Boilerplate XML setup
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'

    # 1. Static routes — clean slugs replacing legacy `.html` paths
    #    Includes critical landing pages from the slug map.
    static_routes = [
        ("/", "1.0", "daily"),
        ("/about", "0.8", "monthly"),
        ("/context", "0.9", "weekly"),
        ("/debate", "0.9", "weekly"),
        ("/resources", "0.9", "weekly"),
        ("/records", "0.9", "weekly"),
        ("/evidence", "0.8", "monthly"),
        ("/timeline", "0.8", "monthly"),
        ("/maps", "0.8", "monthly"),
        ("/news", "0.7", "weekly"),
        ("/news/feed", "0.7", "weekly"),
        ("/blog", "0.7", "weekly"),
        ("/blog/post", "0.6", "monthly"),
        ("/context/essay", "0.7", "monthly"),
        ("/debate/academic-challenges", "0.7", "monthly"),
        ("/debate/popular-challenges", "0.7", "monthly"),
        ("/debate/wikipedia-articles", "0.7", "monthly"),
        ("/debate/historiography", "0.7", "monthly"),
        ("/debate/response", "0.6", "monthly"),
        ("/resources/events", "0.6", "monthly"),
        ("/resources/external-witnesses", "0.6", "monthly"),
        ("/resources/internal-witnesses", "0.6", "monthly"),
        ("/resources/manuscripts", "0.6", "monthly"),
        ("/resources/miracles", "0.6", "monthly"),
        ("/resources/ot-verses", "0.6", "monthly"),
        ("/resources/objects", "0.6", "monthly"),
        ("/resources/people", "0.6", "monthly"),
        ("/resources/sermons-and-sayings", "0.6", "monthly"),
        ("/resources/sites", "0.6", "monthly"),
        ("/resources/sources", "0.6", "monthly"),
        ("/resources/world-events", "0.6", "monthly"),
        ("/maps/roman-empire", "0.6", "monthly"),
        ("/maps/galilee", "0.6", "monthly"),
        ("/maps/jerusalem", "0.6", "monthly"),
        ("/maps/judea", "0.6", "monthly"),
        ("/maps/levant", "0.6", "monthly"),
    ]

    today = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%d")
    for route, priority, freq in static_routes:
        xml_content += f"  <url>\n"
        xml_content += f"    <loc>{BASE_URL}{route}</loc>\n"
        xml_content += f"    <lastmod>{today}</lastmod>\n"
        xml_content += f"    <changefreq>{freq}</changefreq>\n"
        xml_content += f"    <priority>{priority}</priority>\n"
        xml_content += f"  </url>\n"

    # 2. Record deep-dive pages — path-based slugs (e.g. /record/jesus-baptism)
    #    Nginx rewrites /record/{slug} internally to record.html?slug={slug}
    for record in records:
        slug = record.get("slug")
        raw_updated = record.get("updated_at")
        last_mod = raw_updated.split("T")[0] if raw_updated else today

        xml_content += f"  <url>\n"
        xml_content += f"    <loc>{BASE_URL}/record/{slug}</loc>\n"
        xml_content += f"    <lastmod>{last_mod}</lastmod>\n"
        xml_content += f"    <changefreq>monthly</changefreq>\n"
        xml_content += f"    <priority>0.7</priority>\n"
        xml_content += f"  </url>\n"

    # 3. Blog post pages — uses ?id= query param (same convention as /context/essay)
    #    These entries appear in the sitemap as soon as the blogposts column
    #    is populated on any record.
    for post in blog_posts:
        slug = post.get("slug")
        raw_updated = post.get("updated_at")
        last_mod = raw_updated.split("T")[0] if raw_updated else today

        xml_content += f"  <url>\n"
        xml_content += f"    <loc>{BASE_URL}/blog/post?id={slug}</loc>\n"
        xml_content += f"    <lastmod>{last_mod}</lastmod>\n"
        xml_content += f"    <changefreq>monthly</changefreq>\n"
        xml_content += f"    <priority>0.6</priority>\n"
        xml_content += f"  </url>\n"

    xml_content += "</urlset>\n"

    # Ensure nested frontend/pages architecture is correctly scaffolded
    os.makedirs(os.path.dirname(SITEMAP_OUTPUT_PATH), exist_ok=True)
    with open(SITEMAP_OUTPUT_PATH, "w", encoding="utf-8") as f:
        f.write(xml_content)

    logger.info(f"Sitemap explicitly generated to: {SITEMAP_OUTPUT_PATH}")


if __name__ == "__main__":
    generate_sitemap()
