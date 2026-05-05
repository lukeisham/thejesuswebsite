import json
import os
import sqlite3
import sys

import uvicorn
from dotenv import load_dotenv
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

# 1. Path Setup
# Add the project root to sys.path for internal imports
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(ROOT_DIR)
sys.path.append(os.path.join(ROOT_DIR, "admin", "backend"))

load_dotenv()  # noqa: E402 — must run after sys.path

# 2. Import the existing Admin API
# This ensures all your existing API routes are preserved
from admin.backend.admin_api import (  # noqa: E402 — sys.path must be set first
    app as api_app,
)

# Create a container app (using the existing app as the base)
app = api_app

# --- MIDDLEWARE SECTION ---

# 3. Trusted Host Middleware (FIX FOR 400 ERROR)
# This allows the app to recognize requests coming from your domain and Cloudflare
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# 4. CORS Middleware (PREVIOUS FUNCTIONALITY)
# Remains exactly as you had it for local testing and cross-origin access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- PUBLIC API DATABASE CONNECTION ---

# Database path for public JSON API endpoints
DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "database", "database.sqlite"
)


def get_public_db_connection():
    """Get a read-only database connection with Row factory."""
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail="Database file not found.")
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


# --- CLEAN SLUG ROUTE HANDLERS ---
# These return the correct static file for each clean URL slug.
# They are registered BEFORE the static mount so they take precedence.


# 5a. Top-level page slugs
@app.get("/records")
async def records_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/records.html"))


@app.get("/evidence")
async def evidence_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/evidence.html"))


@app.get("/timeline")
async def timeline_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/timeline.html"))


@app.get("/maps")
async def maps_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/maps.html"))


@app.get("/context")
async def context_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/context.html"))


@app.get("/context/essay")
async def context_essay_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/context_essay.html"))


@app.get("/debate")
async def debate_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/debate.html"))


@app.get("/resources")
async def resources_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/resources.html"))


@app.get("/news")
async def news_landing_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/news_and_blog.html"))


@app.get("/news/feed")
async def news_feed_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/news.html"))


@app.get("/blog")
async def blog_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/blog.html"))


@app.get("/blog/post")
async def blog_post_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/blog_post.html"))


@app.get("/blog/{slug}")
async def blog_post_by_slug(slug: str):
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/blog_post.html"))


@app.get("/about")
async def about_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/about.html"))


# 5b. Record deep-dive view — path-parameter slug
# single_view.js reads ?slug= from the query string, so the slug from the
# path is passed as a query param for backward compatibility.
@app.get("/record/{slug}")
async def record_page(slug: str):
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/record.html"))


# 5c. Debate subdirectory slugs
@app.get("/debate/academic-challenges")
async def debate_academic_challenges_page():
    return FileResponse(
        os.path.join(ROOT_DIR, "frontend/pages/debate/academic_challenge.html")
    )


@app.get("/debate/popular-challenges")
async def debate_popular_challenges_page():
    return FileResponse(
        os.path.join(ROOT_DIR, "frontend/pages/debate/popular_challenge.html")
    )


@app.get("/debate/wikipedia-articles")
async def debate_wikipedia_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/debate/wikipedia.html"))


@app.get("/debate/historiography")
async def debate_historiography_page():
    return FileResponse(
        os.path.join(ROOT_DIR, "frontend/pages/debate/historiography.html")
    )


@app.get("/debate/response")
async def debate_response_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/debate/response.html"))


@app.get("/debate/response/{slug}")
async def debate_response_page_with_slug(slug: str):
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/debate/response.html"))


# 5e. Debate URL normalization redirects
# Redirect underscore file paths to clean hyphenated URLs for consistency


@app.get("/debate/academic_challenge.html")
async def redirect_academic_challenges():
    return RedirectResponse(url="/debate/academic-challenges")


@app.get("/debate/popular_challenge.html")
async def redirect_popular_challenges():
    return RedirectResponse(url="/debate/popular-challenges")


@app.get("/debate/wikipedia.html")
async def redirect_wikipedia():
    return RedirectResponse(url="/debate/wikipedia-articles")


@app.get("/debate/historiography.html")
async def redirect_historiography():
    return RedirectResponse(url="/debate/historiography")


# 5f. Resources subdirectory slugs
@app.get("/resources/events")
async def resources_events_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/resources/Events.html"))


@app.get("/resources/external-witnesses")
async def resources_external_witnesses_page():
    return FileResponse(
        os.path.join(ROOT_DIR, "frontend/pages/resources/External witnesses.html")
    )


@app.get("/resources/internal-witnesses")
async def resources_internal_witnesses_page():
    return FileResponse(
        os.path.join(ROOT_DIR, "frontend/pages/resources/Internal witnesses.html")
    )


@app.get("/resources/manuscripts")
async def resources_manuscripts_page():
    return FileResponse(
        os.path.join(ROOT_DIR, "frontend/pages/resources/Manuscripts.html")
    )


@app.get("/resources/miracles")
async def resources_miracles_page():
    return FileResponse(
        os.path.join(ROOT_DIR, "frontend/pages/resources/Miracles.html")
    )


@app.get("/resources/ot-verses")
async def resources_ot_verses_page():
    return FileResponse(
        os.path.join(ROOT_DIR, "frontend/pages/resources/OT Verses.html")
    )


@app.get("/resources/objects")
async def resources_objects_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/resources/Objects.html"))


@app.get("/resources/people")
async def resources_people_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/resources/People.html"))


@app.get("/resources/places")
async def resources_places_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/resources/Places.html"))


@app.get("/resources/sermons-and-sayings")
async def resources_sermons_page():
    return FileResponse(
        os.path.join(ROOT_DIR, "frontend/pages/resources/Sermons and Sayings.html")
    )


@app.get("/resources/sites")
async def resources_sites_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/resources/Sites.html"))


@app.get("/resources/sources")
async def resources_sources_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/resources/Sources.html"))


@app.get("/resources/world-events")
async def resources_world_events_page():
    return FileResponse(
        os.path.join(ROOT_DIR, "frontend/pages/resources/World Events.html")
    )


# --- PUBLIC JSON API ENDPOINTS ---
# These return JSON data from the database for the public-facing site.
# They are registered BEFORE the static mount to take precedence.


@app.get("/api/public/blogposts")
async def public_blogposts(
    limit: int = 50,
    offset: int = 0,
):
    """
    Returns paginated, published records with blogposts column NOT NULL.

    Query parameters:
      limit  — Max rows to return (default 50, max 200).
      offset — Row offset for pagination (default 0).
    """
    try:
        conn = get_public_db_connection()
        cursor = conn.cursor()

        # Get total count for pagination metadata
        cursor.execute(
            "SELECT COUNT(*) as total FROM records WHERE blogposts IS NOT NULL "
            "AND status = 'published'"
        )
        total = cursor.fetchone()["total"]

        safe_limit = max(1, min(limit, 200))
        safe_offset = max(0, offset)

        cursor.execute(
            "SELECT id, title, slug, snippet, blogposts, "
            "created_at, updated_at, picture_name, bibliography, context_links "
            "FROM records WHERE blogposts IS NOT NULL "
            "AND status = 'published' ORDER BY created_at DESC "
            "LIMIT ? OFFSET ?",
            (safe_limit, safe_offset),
        )
        rows = cursor.fetchall()
        conn.close()
        posts = []
        for row in rows:
            post = dict(row)
            if post.get("blogposts"):
                try:
                    post["blogposts"] = json.loads(post["blogposts"])
                except (json.JSONDecodeError, TypeError):
                    pass
            if post.get("bibliography"):
                try:
                    post["bibliography"] = json.loads(post["bibliography"])
                except (json.JSONDecodeError, TypeError):
                    pass
            if post.get("context_links"):
                try:
                    post["context_links"] = json.loads(post["context_links"])
                except (json.JSONDecodeError, TypeError):
                    pass
            posts.append(post)
        has_more = (safe_offset + len(posts)) < total
        return {
            "posts": posts,
            "total": total,
            "offset": safe_offset,
            "limit": safe_limit,
            "has_more": has_more,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/public/blogposts/{slug}")
async def public_blogpost_by_slug(slug: str):
    """
    Returns a single published blog post by slug.
    """
    try:
        conn = get_public_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, slug, snippet, blogposts, description, "
            "created_at, updated_at, picture_name, picture_bytes, "
            "picture_thumbnail, bibliography, context_links "
            "FROM records WHERE slug = ? AND blogposts IS NOT NULL "
            "AND status = 'published'",
            (slug,),
        )
        row = cursor.fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="Blog post not found")
        post = dict(row)
        # Convert BLOBs to None for JSON serialization
        for blob_field in ["picture_bytes", "picture_thumbnail"]:
            if post.get(blob_field):
                post[blob_field] = None  # Don't send binary over JSON API
        if post.get("blogposts"):
            try:
                post["blogposts"] = json.loads(post["blogposts"])
            except (json.JSONDecodeError, TypeError):
                pass
        if post.get("description"):
            try:
                post["description"] = json.loads(post["description"])
            except (json.JSONDecodeError, TypeError):
                pass
        if post.get("bibliography"):
            try:
                post["bibliography"] = json.loads(post["bibliography"])
            except (json.JSONDecodeError, TypeError):
                pass
        if post.get("context_links"):
            try:
                post["context_links"] = json.loads(post["context_links"])
            except (json.JSONDecodeError, TypeError):
                pass
        return {"post": post}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/public/news")
async def public_news_items(
    limit: int = 50,
    offset: int = 0,
):
    """
    Returns paginated, published records with news_items column NOT NULL.

    Query parameters:
      limit  — Max rows to return (default 50, max 200).
      offset — Row offset for pagination (default 0).
    """
    try:
        conn = get_public_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            "SELECT COUNT(*) as total FROM records WHERE news_items IS NOT NULL "
            "AND status = 'published'"
        )
        total = cursor.fetchone()["total"]

        safe_limit = max(1, min(limit, 200))
        safe_offset = max(0, offset)

        cursor.execute(
            "SELECT id, title, slug, snippet, news_items, created_at, "
            "updated_at FROM records WHERE news_items IS NOT NULL "
            "AND status = 'published' ORDER BY created_at DESC "
            "LIMIT ? OFFSET ?",
            (safe_limit, safe_offset),
        )
        rows = cursor.fetchall()
        conn.close()
        items = []
        for row in rows:
            item = dict(row)
            if item.get("news_items"):
                try:
                    item["news_items"] = json.loads(item["news_items"])
                except (json.JSONDecodeError, TypeError):
                    pass
            items.append(item)
        has_more = (safe_offset + len(items)) < total
        return {
            "news": items,
            "total": total,
            "offset": safe_offset,
            "limit": safe_limit,
            "has_more": has_more,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/public/responses/{slug}")
async def public_response_by_slug(slug: str):
    """
    Returns a single published response record by slug.
    Response records have challenge_id NOT NULL.
    """
    try:
        conn = get_public_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, slug, snippet, description, challenge_id, "
            "created_at, updated_at, picture_name, bibliography, context_links "
            "FROM records WHERE slug = ? AND challenge_id IS NOT NULL "
            "AND status = 'published'",
            (slug,),
        )
        row = cursor.fetchone()
        conn.close()
        if not row:
            raise HTTPException(status_code=404, detail="Response not found")
        resp = dict(row)
        if resp.get("description"):
            try:
                resp["description"] = json.loads(resp["description"])
            except (json.JSONDecodeError, TypeError):
                pass
        if resp.get("bibliography"):
            try:
                resp["bibliography"] = json.loads(resp["bibliography"])
            except (json.JSONDecodeError, TypeError):
                pass
        if resp.get("context_links"):
            try:
                resp["context_links"] = json.loads(resp["context_links"])
            except (json.JSONDecodeError, TypeError):
                pass
        return {"response": resp}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/public/essays")
async def public_essays():
    """
    Returns all published records with context_essays column NOT NULL.
    """
    try:
        conn = get_public_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, slug, snippet, context_essays, description, "
            "created_at, updated_at, picture_name, bibliography, context_links "
            "FROM records WHERE context_essays IS NOT NULL "
            "AND status = 'published' ORDER BY created_at DESC"
        )
        rows = cursor.fetchall()
        conn.close()
        essays = []
        for row in rows:
            essay = dict(row)
            if essay.get("context_essays"):
                try:
                    essay["context_essays"] = json.loads(essay["context_essays"])
                except (json.JSONDecodeError, TypeError):
                    pass
            if essay.get("description"):
                try:
                    essay["description"] = json.loads(essay["description"])
                except (json.JSONDecodeError, TypeError):
                    pass
            if essay.get("bibliography"):
                try:
                    essay["bibliography"] = json.loads(essay["bibliography"])
                except (json.JSONDecodeError, TypeError):
                    pass
            if essay.get("context_links"):
                try:
                    essay["context_links"] = json.loads(essay["context_links"])
                except (json.JSONDecodeError, TypeError):
                    pass
            essays.append(essay)
        return {"essays": essays}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- STATIC FILES SECTION ---

# 6. Static File Mounting (PREVIOUS FUNCTIONALITY)
# Mounted LAST so that specific API routes, clean slug handlers, and
# public JSON API endpoints take precedence over file lookups.
app.mount("/", StaticFiles(directory=ROOT_DIR, html=True), name="static")

if __name__ == "__main__":
    # Local debugging configuration
    print("Starting Unified Test Server on http://localhost:8000")
    print(" - Public Site: http://localhost:8000/index.html")
    print(" - Admin Site:  http://localhost:8000/admin/frontend/admin.html")
    print(" - Admin API:   http://localhost:8000/api/admin/...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
