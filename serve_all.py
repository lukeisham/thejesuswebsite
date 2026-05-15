import base64
import json
import os
import sqlite3
import sys
from typing import Optional

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

# 2. Import the Admin API from the modular routes package
from admin.backend.routes import create_app  # noqa: E402 — sys.path must be set first

# Create the app using the factory function (replaces monolithic admin_api.py)
app = create_app()

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


# 5. Content Security Policy Middleware
# Overrides Cloudflare's report-only CSP with an enforced policy that
# allows all self-hosted scripts, styles, and API connections while
# still permitting Cloudflare's own analytics beacon.
@app.middleware("http")
async def add_csp_header(request, call_next):
    response = await call_next(request)
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src-elem 'self' https://static.cloudflareinsights.com; "
        "connect-src 'self' https://static.cloudflareinsights.com; "
        "style-src 'self' 'unsafe-inline'; "
        "style-src-elem 'self' 'unsafe-inline'; "
        "style-src-attr 'self' 'unsafe-inline'; "
        "img-src 'self' data:; "
        "font-src 'self'; "
        "frame-src 'self'"
    )
    return response


# --- PUBLIC API DATABASE CONNECTION ---

# Database path for public JSON API endpoints
DB_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "database", "database.sqlite"
)


def get_public_db_connection():
    """Get a read-only database connection with Row factory."""
    if not os.path.exists(DB_PATH):
        raise HTTPException(status_code=500, detail="Database file not found.")
    db_uri = f"file:{DB_PATH}?mode=ro"
    conn = sqlite3.connect(db_uri, uri=True)
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


@app.get("/news_and_blog.html")
async def news_and_blog_landing_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/news_and_blog.html"))


@app.get("/news.html")
async def news_html_feed_page():
    return FileResponse(os.path.join(ROOT_DIR, "frontend/pages/news.html"))


@app.get("/blog.html")
async def blog_html_feed_page():
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
    type: Optional[str] = None,
    status: Optional[str] = None,
):
    """
    Returns paginated, published records with blogposts column NOT NULL.

    Query parameters:
      limit  — Max rows to return (default 50, max 200).
      offset — Row offset for pagination (default 0).
      type   — Optional type discriminator (e.g. 'blog_post').
      status — Optional status filter (e.g. 'published').
    """
    try:
        conn = get_public_db_connection()
        cursor = conn.cursor()

        # Build WHERE clause: prefer type discriminator, fall back to legacy
        if type:
            where_clause = "type = ?"
            count_params = [type]
            if status:
                where_clause += " AND status = ?"
                count_params.append(status)
            else:
                where_clause += " AND status = 'published'"
        else:
            where_clause = "blogposts IS NOT NULL AND status = 'published'"
            count_params = []

        cursor.execute(
            f"SELECT COUNT(*) as total FROM records WHERE {where_clause}",
            count_params,
        )
        total = cursor.fetchone()["total"]

        safe_limit = max(1, min(limit, 200))
        safe_offset = max(0, offset)

        if type:
            select_cols = (
                "SELECT id, title, slug, snippet, blogposts, body, iaa, "
                "pledius, manuscript, url, page_views, metadata_json, "
                "created_at, updated_at, picture_name, picture_thumbnail, "
                "bibliography, context_links "
                "FROM records WHERE " + where_clause + " ORDER BY created_at DESC "
                "LIMIT ? OFFSET ?"
            )
            query_params = count_params + [safe_limit, safe_offset]
        else:
            select_cols = (
                "SELECT id, title, slug, snippet, blogposts, "
                "created_at, updated_at, picture_name, picture_thumbnail, "
                "bibliography, context_links "
                "FROM records WHERE " + where_clause + " ORDER BY created_at DESC "
                "LIMIT ? OFFSET ?"
            )
            query_params = count_params + [safe_limit, safe_offset]

        cursor.execute(select_cols, query_params)
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
            if post.get("snippet"):
                try:
                    post["snippet"] = json.loads(post["snippet"])
                except (json.JSONDecodeError, TypeError):
                    pass
            if post.get("metadata_json"):
                try:
                    post["metadata_json"] = json.loads(post["metadata_json"])
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
            # Decode picture_thumbnail BLOB to base64 data URI for frontend
            thumb_blob = post.get("picture_thumbnail")
            if thumb_blob:
                try:
                    b64_str = base64.b64encode(thumb_blob).decode("ascii")
                    post["picture_thumbnail"] = "data:image/png;base64," + b64_str
                except Exception:
                    post["picture_thumbnail"] = None
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
            "SELECT id, title, slug, snippet, blogposts, description, body, "
            "iaa, pledius, manuscript, url, page_views, metadata_json, "
            "created_at, updated_at, picture_name, picture_bytes, "
            "picture_thumbnail, bibliography, context_links "
            "FROM records WHERE slug = ? "
            "AND (type = 'blog_post' OR blogposts IS NOT NULL) "
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
        if post.get("snippet"):
            try:
                post["snippet"] = json.loads(post["snippet"])
            except (json.JSONDecodeError, TypeError):
                pass
        if post.get("description"):
            try:
                post["description"] = json.loads(post["description"])
            except (json.JSONDecodeError, TypeError):
                pass
        if post.get("metadata_json"):
            try:
                post["metadata_json"] = json.loads(post["metadata_json"])
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
    type: Optional[str] = None,
    status: Optional[str] = None,
):
    """
    Returns paginated, published news articles using type discriminator.
    Falls back to legacy news_items IS NOT NULL if no type param provided.

    Query parameters:
      limit  — Max rows to return (default 50, max 200).
      offset — Row offset for pagination (default 0).
      type   — Optional type discriminator (e.g. 'news_article').
      status — Optional status filter (e.g. 'published').
    """
    try:
        conn = get_public_db_connection()
        cursor = conn.cursor()

        # Build WHERE clause: prefer type discriminator, fall back to legacy
        if type:
            where_clause = "type = ?"
            count_params = [type]
            if status:
                where_clause += " AND status = ?"
                count_params.append(status)
            else:
                where_clause += " AND status = 'published'"
        else:
            # Legacy fallback for backward compatibility
            where_clause = "news_items IS NOT NULL AND status = 'published'"
            count_params = []

        cursor.execute(
            f"SELECT COUNT(*) as total FROM records WHERE {where_clause}",
            count_params,
        )
        total = cursor.fetchone()["total"]

        safe_limit = max(1, min(limit, 200))
        safe_offset = max(0, offset)

        # Use structured columns when querying by type;
        # include legacy columns as fallback
        if type:
            select_cols = (
                "SELECT id, title, slug, snippet, news_item_title, "
                "news_item_link, last_crawled, news_items, created_at, "
                "updated_at, status, type, sub_type, picture_name, "
                "picture_thumbnail "
                "FROM records WHERE "
                + where_clause
                + " ORDER BY last_crawled DESC, created_at DESC "
                "LIMIT ? OFFSET ?"
            )
            query_params = count_params + [safe_limit, safe_offset]
        else:
            select_cols = (
                "SELECT id, title, slug, snippet, news_items, created_at, "
                "updated_at FROM records WHERE "
                + where_clause
                + " ORDER BY created_at DESC "
                "LIMIT ? OFFSET ?"
            )
            query_params = count_params + [safe_limit, safe_offset]

        cursor.execute(select_cols, query_params)
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
            if item.get("snippet"):
                try:
                    item["snippet"] = json.loads(item["snippet"])
                except (json.JSONDecodeError, TypeError):
                    pass
            # Decode picture_thumbnail BLOB to base64 data URI for frontend
            thumb_blob = item.get("picture_thumbnail")
            if thumb_blob:
                try:
                    b64_str = base64.b64encode(thumb_blob).decode("ascii")
                    item["picture_thumbnail"] = "data:image/png;base64," + b64_str
                except Exception:
                    item["picture_thumbnail"] = None
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
            "SELECT id, title, slug, snippet, description, body, challenge_id, "
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
        if resp.get("snippet"):
            try:
                resp["snippet"] = json.loads(resp["snippet"])
            except (json.JSONDecodeError, TypeError):
                pass
        if resp.get("description"):
            try:
                resp["description"] = json.loads(resp["description"])
            except (json.JSONDecodeError, TypeError):
                pass
        if resp.get("body"):
            try:
                resp["body"] = json.loads(resp["body"])
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


@app.get("/api/public/essays/historiography")
async def public_essay_historiography(
    type: Optional[str] = None,
    status: Optional[str] = None,
):
    """
    Returns the singleton historiography record (slug = 'historiography').

    Query parameters:
      type   — Type discriminator (e.g. 'historiography').
      status — Optional status filter (defaults to 'published').
    """
    try:
        conn = get_public_db_connection()
        cursor = conn.cursor()

        target_status = status if status else "published"

        cursor.execute(
            "SELECT id, title, slug, snippet, body, context_essays, description, "
            "iaa, pledius, manuscript, url, metadata_json, "
            "created_at, updated_at, picture_name, bibliography, context_links "
            "FROM records WHERE slug = 'historiography' "
            "AND status = ?",
            (target_status,),
        )
        row = cursor.fetchone()
        conn.close()

        if not row:
            raise HTTPException(
                status_code=404, detail="Historiography record not found."
            )

        essay = dict(row)
        # Parse JSON fields for structured consumption
        for json_field in [
            "snippet",
            "description",
            "body",
            "context_essays",
            "metadata_json",
            "bibliography",
            "context_links",
            "url",
        ]:
            if essay.get(json_field):
                try:
                    essay[json_field] = json.loads(essay[json_field])
                except (json.JSONDecodeError, TypeError):
                    pass

        return {"essay": essay}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/public/essays/{slug}")
async def public_essay_by_slug(
    slug: str,
    type: Optional[str] = None,
    status: Optional[str] = None,
):
    """
    Returns a single published essay by slug.

    Path parameters:
      slug   — The URL-safe slug of the essay.

    Query parameters:
      type   — Type discriminator (e.g. 'context_essay').
      status — Optional status filter (defaults to 'published').
    """
    try:
        conn = get_public_db_connection()
        cursor = conn.cursor()

        target_status = status if status else "published"

        # Restrict to essay types so non-essay records can't be fetched here
        essay_types = (
            "context_essay",
            "historiographical_essay",
            "theological_essay",
        )

        if type and type in essay_types:
            type_clause = "type = ?"
            params = [slug, type, target_status]
        else:
            placeholders = ", ".join("?" for _ in essay_types)
            type_clause = f"type IN ({placeholders})"
            params = [slug] + list(essay_types) + [target_status]

        cursor.execute(
            "SELECT id, title, slug, snippet, body, context_essays, description, "
            "iaa, pledius, manuscript, url, metadata_json, "
            "created_at, updated_at, picture_name, bibliography, context_links "
            f"FROM records WHERE slug = ? AND {type_clause} "
            "AND status = ?",
            params,
        )
        row = cursor.fetchone()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="Essay not found")

        essay = dict(row)
        # Parse JSON fields for structured consumption
        for json_field in [
            "snippet",
            "description",
            "body",
            "context_essays",
            "metadata_json",
            "bibliography",
            "context_links",
            "url",
        ]:
            if essay.get(json_field):
                try:
                    essay[json_field] = json.loads(essay[json_field])
                except (json.JSONDecodeError, TypeError):
                    pass

        return {"essay": essay}

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


@app.get("/api/public/challenges")
async def public_challenges(
    limit: int = 50,
    offset: int = 0,
    type: Optional[str] = None,
    status: Optional[str] = None,
):
    """
    Returns paginated challenge records using type discriminator.

    Query parameters:
      limit  — Max rows to return (default 50, max 200).
      offset — Row offset for pagination (default 0).
      type   — Type discriminator (e.g. 'challenge_academic', 'challenge_popular').
      status — Optional status filter (e.g. 'published').
    """
    try:
        conn = get_public_db_connection()
        cursor = conn.cursor()

        # Build WHERE clause with type discriminator
        if type:
            where_clause = "type = ?"
            count_params = [type]
            if status:
                where_clause += " AND status = ?"
                count_params.append(status)
            else:
                where_clause += " AND status = 'published'"
        else:
            # Fallback: any challenge type
            where_clause = (
                "(type = 'challenge_academic' OR type = 'challenge_popular') "
                "AND status = 'published'"
            )
            count_params = []

        cursor.execute(
            f"SELECT COUNT(*) as total FROM records WHERE {where_clause}",
            count_params,
        )
        total = cursor.fetchone()["total"]

        safe_limit = max(1, min(limit, 200))
        safe_offset = max(0, offset)

        # Select type-specific and shared columns, grouped by id
        select_cols = (
            "SELECT id, title, slug, snippet, status, created_at, updated_at, "
            "sub_type, academic_challenge_title, academic_challenge_link, "
            "academic_challenge_rank, academic_challenge_weight, "
            "popular_challenge_title, popular_challenge_link, "
            "popular_challenge_rank, popular_challenge_weight "
            "FROM records WHERE "
            + where_clause
            + " GROUP BY id ORDER BY created_at DESC "
            "LIMIT ? OFFSET ?"
        )
        query_params = count_params + [safe_limit, safe_offset]

        cursor.execute(select_cols, query_params)
        rows = cursor.fetchall()
        conn.close()
        items = []
        for row in rows:
            item = dict(row)
            # Parse JSON fields
            if item.get("snippet"):
                try:
                    item["snippet"] = json.loads(item["snippet"])
                except (json.JSONDecodeError, TypeError):
                    pass
            if item.get("academic_challenge_link"):
                try:
                    item["academic_challenge_link"] = json.loads(
                        item["academic_challenge_link"]
                    )
                except (json.JSONDecodeError, TypeError):
                    pass
            if item.get("popular_challenge_link"):
                try:
                    item["popular_challenge_link"] = json.loads(
                        item["popular_challenge_link"]
                    )
                except (json.JSONDecodeError, TypeError):
                    pass
            if item.get("academic_challenge_weight"):
                try:
                    item["academic_challenge_weight"] = json.loads(
                        item["academic_challenge_weight"]
                    )
                except (json.JSONDecodeError, TypeError):
                    pass
            if item.get("popular_challenge_weight"):
                try:
                    item["popular_challenge_weight"] = json.loads(
                        item["popular_challenge_weight"]
                    )
                except (json.JSONDecodeError, TypeError):
                    pass
            items.append(item)
        has_more = (safe_offset + len(items)) < total
        return {
            "challenges": items,
            "total": total,
            "offset": safe_offset,
            "limit": safe_limit,
            "has_more": has_more,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/public/wikipedia")
async def public_wikipedia(
    limit: int = 50,
    offset: int = 0,
    status: Optional[str] = None,
):
    """
    Returns paginated wikipedia_entry records.

    Query parameters:
      limit  — Max rows to return (default 50, max 200).
      offset — Row offset for pagination (default 0).
      status — Optional status filter (e.g. 'published').
    """
    try:
        conn = get_public_db_connection()
        cursor = conn.cursor()

        where_clause = "type = 'wikipedia_entry'"
        count_params = []
        if status:
            where_clause += " AND status = ?"
            count_params.append(status)
        else:
            where_clause += " AND status = 'published'"

        cursor.execute(
            f"SELECT COUNT(*) as total FROM records WHERE {where_clause}",
            count_params,
        )
        total = cursor.fetchone()["total"]

        safe_limit = max(1, min(limit, 200))
        safe_offset = max(0, offset)

        select_cols = (
            "SELECT id, title, slug, snippet, status, created_at, updated_at, "
            "sub_type, wikipedia_title, wikipedia_link, "
            "wikipedia_rank, wikipedia_weight "
            "FROM records WHERE "
            + where_clause
            + " GROUP BY id ORDER BY created_at DESC "
            "LIMIT ? OFFSET ?"
        )
        query_params = count_params + [safe_limit, safe_offset]

        cursor.execute(select_cols, query_params)
        rows = cursor.fetchall()
        conn.close()
        items = []
        for row in rows:
            item = dict(row)
            if item.get("snippet"):
                try:
                    item["snippet"] = json.loads(item["snippet"])
                except (json.JSONDecodeError, TypeError):
                    pass
            if item.get("wikipedia_link"):
                try:
                    item["wikipedia_link"] = json.loads(item["wikipedia_link"])
                except (json.JSONDecodeError, TypeError):
                    pass
            if item.get("wikipedia_weight"):
                try:
                    item["wikipedia_weight"] = json.loads(item["wikipedia_weight"])
                except (json.JSONDecodeError, TypeError):
                    pass
            items.append(item)
        has_more = (safe_offset + len(items)) < total
        return {
            "wikipedia": items,
            "total": total,
            "offset": safe_offset,
            "limit": safe_limit,
            "has_more": has_more,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/public/responses")
async def public_responses(
    limit: int = 50,
    offset: int = 0,
    type: Optional[str] = None,
    status: Optional[str] = None,
):
    """
    Returns paginated response records (type = 'challenge_response').

    Query parameters:
      limit  — Max rows to return (default 50, max 200).
      offset — Row offset for pagination (default 0).
      type   — Type discriminator override (default: 'challenge_response').
      status — Optional status filter (e.g. 'published').
    """
    try:
        conn = get_public_db_connection()
        cursor = conn.cursor()

        if type:
            where_clause = "type = ?"
            count_params = [type]
        else:
            # Fallback: use type discriminator or legacy check
            where_clause = "(type = 'challenge_response' OR challenge_id IS NOT NULL)"
            count_params = []
        if status:
            where_clause += " AND status = ?"
            count_params.append(status)
        else:
            where_clause += " AND status = 'published'"

        cursor.execute(
            f"SELECT COUNT(*) as total FROM records WHERE {where_clause}",
            count_params,
        )
        total = cursor.fetchone()["total"]

        safe_limit = max(1, min(limit, 200))
        safe_offset = max(0, offset)

        select_cols = (
            "SELECT id, title, slug, snippet, description, body, challenge_id, "
            "created_at, updated_at, picture_name, bibliography, context_links "
            "FROM records WHERE " + where_clause + " ORDER BY created_at DESC "
            "LIMIT ? OFFSET ?"
        )
        query_params = count_params + [safe_limit, safe_offset]

        cursor.execute(select_cols, query_params)
        rows = cursor.fetchall()
        conn.close()
        items = []
        for row in rows:
            item = dict(row)
            if item.get("snippet"):
                try:
                    item["snippet"] = json.loads(item["snippet"])
                except (json.JSONDecodeError, TypeError):
                    pass
            if item.get("description"):
                try:
                    item["description"] = json.loads(item["description"])
                except (json.JSONDecodeError, TypeError):
                    pass
            if item.get("body"):
                try:
                    item["body"] = json.loads(item["body"])
                except (json.JSONDecodeError, TypeError):
                    pass
            if item.get("bibliography"):
                try:
                    item["bibliography"] = json.loads(item["bibliography"])
                except (json.JSONDecodeError, TypeError):
                    pass
            if item.get("context_links"):
                try:
                    item["context_links"] = json.loads(item["context_links"])
                except (json.JSONDecodeError, TypeError):
                    pass
            items.append(item)
        has_more = (safe_offset + len(items)) < total
        return {
            "responses": items,
            "total": total,
            "offset": safe_offset,
            "limit": safe_limit,
            "has_more": has_more,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/public/diagram/tree")
async def public_diagram_tree():
    """
    Returns all published records as a flat node list for the evidence
    diagram tree. The frontend assembles this into a recursive tree by
    grouping on parent_id. parent_id may be null (root nodes).
    """
    try:
        conn = get_public_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, title, slug, parent_id, snippet, primary_verse FROM records "
            "WHERE status = 'published' ORDER BY title"
        )
        nodes = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return {"nodes": nodes}
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
