import os
import sys

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

load_dotenv()

# 1. Path Setup
# Add the project root to sys.path for internal imports
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(ROOT_DIR)
sys.path.append(os.path.join(ROOT_DIR, "admin", "backend"))

# 2. Import the existing Admin API
# This ensures all your existing API routes are preserved
from admin.backend.admin_api import app as api_app

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


# 5d. Resources subdirectory slugs
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


# --- STATIC FILES SECTION ---

# 6. Static File Mounting (PREVIOUS FUNCTIONALITY)
# Mounted LAST so that specific API routes and clean slug handlers
# take precedence over file lookups.
app.mount("/", StaticFiles(directory=ROOT_DIR, html=True), name="static")

if __name__ == "__main__":
    # Local debugging configuration
    print("Starting Unified Test Server on http://localhost:8000")
    print(" - Public Site: http://localhost:8000/index.html")
    print(" - Admin Site:  http://localhost:8000/admin/frontend/admin.html")
    print(" - Admin API:   http://localhost:8000/api/admin/...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
