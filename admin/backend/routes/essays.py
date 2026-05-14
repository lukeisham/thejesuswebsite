# =============================================================================
#   THE JESUS WEBSITE — ADMIN ROUTES: ESSAYS & HISTORIOGRAPHY
#   File:    admin/backend/routes/essays.py
#   Version: 1.0.0
#   Purpose: Essay listing, historiography retrieval, snippet generation
#            trigger, and metadata generation trigger.
# =============================================================================

from fastapi import APIRouter, Depends, HTTPException

from backend.scripts.metadata_generator import generate_metadata
from backend.scripts.slug_generator import generate_slug
from backend.scripts.snippet_generator import generate_snippet

from .shared import (
    MetadataGenerateRequest,
    SnippetGenerateRequest,
    get_db_connection,
    verify_token,
)

router = APIRouter()


@router.get("/api/admin/essays")
async def get_essays(
    admin_data: dict = Depends(verify_token),
):
    """
    Returns all records where type column contains 'essay', ordered by title.
    Consumed by plan_dashboard_essay_historiography.

    Note: The 'type' field is not a dedicated column in the current schema.
    Essay records are identified by having non-NULL context_essays or
    theological_essays columns, or by the slug pattern.
    For forward compatibility, this endpoint checks for records whose slug
    matches known essay patterns or has essay content populated.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        # Essay records are those with essay content or essay-related slugs
        cursor.execute(
            """
            SELECT id, title, slug, snippet, created_at, updated_at, status,
                   context_essays, theological_essays, spiritual_articles
            FROM records
            WHERE context_essays IS NOT NULL
               OR theological_essays IS NOT NULL
               OR spiritual_articles IS NOT NULL
               OR slug LIKE '%essay%'
            ORDER BY title ASC
            """
        )
        essays = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return essays
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to fetch essays: " + str(e))


@router.get("/api/admin/historiography")
async def get_historiography(admin_data: dict = Depends(verify_token)):
    """
    Returns the single record where slug = 'historiography'. 404 if missing.
    Consumed by plan_dashboard_essay_historiography.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM records WHERE slug = ?", ("historiography",))
        row = cursor.fetchone()
        conn.close()

        if not row:
            raise HTTPException(
                status_code=404, detail="Historiography record not found."
            )

        return dict(row)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to fetch historiography: " + str(e)
        )


@router.post("/api/admin/snippet/generate")
async def trigger_snippet_generation(
    body: SnippetGenerateRequest,
    admin_data: dict = Depends(verify_token),
):
    """
    Triggers snippet_generator.py for a record.
    Accepts JSON body with slug and content. Returns the generated snippet string.
    Consumed by the shared snippet_generator.js dashboard tool.
    """
    if not body.content or not body.content.strip():
        raise HTTPException(status_code=400, detail="Content must not be empty.")

    try:
        snippet = generate_snippet(content=body.content, slug=body.slug)
        return {"snippet": snippet, "slug": body.slug}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail="DeepSeek API error: " + str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to generate snippet: " + str(e)
        )


@router.post("/api/admin/slug/generate")
async def trigger_slug_generation(
    body: SnippetGenerateRequest,
    admin_data: dict = Depends(verify_token),
):
    """
    Triggers slug_generator.py for a record.
    Accepts JSON body with slug and content (title). Returns the generated slug string.
    Consumed by the shared metadata_widget.js dashboard tool.
    """
    if not body.content or not body.content.strip():
        raise HTTPException(status_code=400, detail="Title must not be empty.")

    try:
        slug = generate_slug(title=body.content, slug=body.slug)
        return {"slug": slug, "original_slug": body.slug}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail="DeepSeek API error: " + str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to generate slug: " + str(e)
        )


@router.post("/api/admin/metadata/generate")
async def trigger_metadata_generation(
    body: MetadataGenerateRequest,
    admin_data: dict = Depends(verify_token),
):
    """
    Triggers metadata_generator.py for a record.
    Accepts JSON body with slug and content. Returns keywords and meta_description.
    Consumed by the shared metadata_handler.js dashboard tool.
    """
    if not body.content or not body.content.strip():
        raise HTTPException(status_code=400, detail="Content must not be empty.")

    try:
        result = generate_metadata(content=body.content, slug=body.slug)
        return {
            "keywords": result["keywords"],
            "meta_description": result["meta_description"],
            "slug": body.slug,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail="DeepSeek API error: " + str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Failed to generate metadata: " + str(e)
        )
