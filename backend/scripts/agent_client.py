# =============================================================================
#   THE JESUS WEBSITE — DEEPSEEK AGENT CLIENT
#   File:    backend/scripts/agent_client.py
#   Version: 1.0.0
#   Purpose: Shared DeepSeek API client used by all agent-powered scripts
#            (challenge pipelines, snippet generator, metadata generator).
#
#   DATA FLOW:
#     Called by snippet_generator.py, metadata_generator.py, and the admin API
#     agent/run endpoint. Each call opens a fresh DB connection, writes a
#     running row to agent_run_log, executes the DeepSeek API request, then
#     updates the log row with the final status and metrics.
#
#   QUIRKS:
#     - The DeepSeek Chat Completions API is OpenAI-compatible. We use the
#       same base URL pattern as the OpenAI Python SDK but pointed at
#       https://api.deepseek.com/v1.
#     - Web search requires the `deepseek-chat` model with `web_search`
#       enabled in the request body. Non-search calls use the same model
#       without the web_search option.
#     - On 429 (rate limit), we retry with exponential backoff up to 3 times.
#     - The DEEPSEEK_KEY is read from .env at the project root.
# =============================================================================

import json
import os
import sqlite3
import sys
import time
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Path setup — ensure imports work regardless of execution context
# ---------------------------------------------------------------------------

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT_DIR)

load_dotenv(os.path.join(ROOT_DIR, ".env"))

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

DEEPSEEK_KEY = os.getenv("DEEPSEEK_KEY", "")
DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1"
DEEPSEEK_CHAT_URL = f"{DEEPSEEK_BASE_URL}/chat/completions"
DEFAULT_MODEL = "deepseek-chat"
MAX_RETRIES = 3
BACKOFF_SECONDS = 2
DB_PATH = os.path.join(ROOT_DIR, "database", "database.sqlite")

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _now_iso() -> str:
    """Return current UTC timestamp as ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat()


def _get_db() -> sqlite3.Connection:
    """Open and return a SQLite connection with row_factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _insert_log_run(
    pipeline: str,
    record_slug: str | None = None,
) -> int:
    """
    Insert a new agent_run_log row with status='running' and return its id.
    """
    conn = _get_db()
    cursor = conn.cursor()
    now = _now_iso()
    cursor.execute(
        """
        INSERT INTO agent_run_log
            (pipeline, record_slug, status, started_at)
        VALUES (?, ?, 'running', ?)
        """,
        (pipeline, record_slug, now),
    )
    conn.commit()
    run_id = cursor.lastrowid
    conn.close()
    if run_id is None:
        raise RuntimeError("Failed to insert agent_run_log row.")
    return run_id


def _update_log_completed(
    run_id: int,
    trace_reasoning: str,
    tokens_used: int,
    articles_found: int = 0,
) -> None:
    """
    Update an agent_run_log row to status='completed' with output metrics.

    Note: `articles_found` now represents NEW items added (not total crawled).
    The database column retains the name 'articles_found' for schema compatibility.
    """
    conn = _get_db()
    cursor = conn.cursor()
    now = _now_iso()
    cursor.execute(
        """
        UPDATE agent_run_log
        SET status = 'completed',
            trace_reasoning = ?,
            tokens_used = ?,
            articles_found = ?,
            completed_at = ?
        WHERE id = ?
        """,
        (trace_reasoning, tokens_used, articles_found, now, run_id),
    )
    conn.commit()
    conn.close()


def _update_log_failed(run_id: int, error_message: str) -> None:
    """
    Update an agent_run_log row to status='failed' with the error message.
    """
    conn = _get_db()
    cursor = conn.cursor()
    now = _now_iso()
    cursor.execute(
        """
        UPDATE agent_run_log
        SET status = 'failed',
            error_message = ?,
            completed_at = ?
        WHERE id = ?
        """,
        (error_message, now, run_id),
    )
    conn.commit()
    conn.close()


def _call_deepseek(
    messages: list[dict],
    web_search: bool = False,
    max_tokens: int = 2048,
) -> dict:
    """
    Execute a single DeepSeek Chat Completions API call with retry logic.

    Args:
        messages: List of {"role": str, "content": str} dicts.
        web_search: If True, enable DeepSeek's built-in web search capability.
        max_tokens: Maximum completion tokens.

    Returns:
        dict with keys:
            - content: The assistant's text response.
            - trace_reasoning: Chain-of-thought reasoning (empty string if absent).
            - tokens_used: Total tokens consumed (prompt + completion).

    Raises:
        RuntimeError: If all retries are exhausted or the API key is missing.
    """
    if not DEEPSEEK_KEY:
        raise RuntimeError(
            "DEEPSEEK_KEY is not set in .env — cannot call DeepSeek API."
        )

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_KEY}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    body: dict = {
        "model": DEFAULT_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "stream": False,
    }
    if web_search:
        body["web_search"] = True

    last_error = None
    response = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            response = requests.post(
                DEEPSEEK_CHAT_URL,
                headers=headers,
                json=body,
                timeout=120,  # DeepSeek reasoning can be slow
            )

            if response.status_code == 429:
                # Rate limited — back off and retry
                wait = BACKOFF_SECONDS * (2 ** (attempt - 1))
                time.sleep(wait)
                last_error = f"Rate limited (429) on attempt {attempt}"
                continue

            response.raise_for_status()
            data = response.json()

            # Extract the assistant message
            choices = data.get("choices", [])
            if not choices:
                raise RuntimeError("DeepSeek returned no choices in response.")

            message = choices[0].get("message", {})
            content = message.get("content", "")
            reasoning = message.get("reasoning_content", "")

            # Extract token usage
            usage = data.get("usage", {})
            tokens_used = usage.get("total_tokens", 0)

            return {
                "content": content,
                "trace_reasoning": reasoning,
                "tokens_used": tokens_used,
            }

        except requests.exceptions.Timeout:
            last_error = f"Timeout on attempt {attempt}"
            if attempt < MAX_RETRIES:
                time.sleep(BACKOFF_SECONDS * (2 ** (attempt - 1)))
        except requests.exceptions.ConnectionError as e:
            last_error = f"Connection error on attempt {attempt}: {e}"
            if attempt < MAX_RETRIES:
                time.sleep(BACKOFF_SECONDS * (2 ** (attempt - 1)))
        except requests.exceptions.HTTPError as e:
            last_error = f"HTTP error on attempt {attempt}: {e}"
            # Don't retry on 4xx (except 429 which is handled above)
            resp_code = response.status_code if response is not None else 500
            if resp_code < 500 and resp_code != 429:
                break
            if attempt < MAX_RETRIES:
                time.sleep(BACKOFF_SECONDS * (2 ** (attempt - 1)))

    raise RuntimeError(
        f"DeepSeek API call failed after {MAX_RETRIES} attempts. "
        f"Last error: {last_error}"
    )


# ---------------------------------------------------------------------------
# Public API — three functions exposed for the project
# ---------------------------------------------------------------------------


def search_web(
    search_terms: str,
    record_slug: str,
    pipeline: str,
    run_id: int | None = None,
) -> dict:
    """
    Web-search enabled DeepSeek call for article discovery with relevance scores.

    Logs chain-of-thought reasoning and token usage to agent_run_log.

    Args:
        search_terms: The search query string (e.g., from
                      academic_challenge_search_term or popular_challenge_search_term).
        record_slug: The slug of the record being processed.
        pipeline: One of 'academic_challenges' or 'popular_challenges'.
        run_id: Optional existing agent_run_log row ID to update instead of
                creating a new row. When called from the admin API, the run
                row is already inserted by the endpoint.

    Returns:
        dict with keys:
            - articles: list of dicts with title, url, relevance_score.
            - trace_reasoning: The agent's chain-of-thought log.
            - tokens_used: Total tokens consumed.
    """
    if run_id is None:
        run_id = _insert_log_run(pipeline=pipeline, record_slug=record_slug)

    try:
        system_prompt = (
            "You are a scholarly research assistant for The Jesus Website, "
            "an archival website organising historical information about Jesus. "
            "Your tone is academic, precise, and objective."
        )

        user_prompt = (
            f"Search the web for the most relevant academic and historical articles "
            f'related to the following topic: "{search_terms}".\n\n'
            f"Return your findings as a JSON array of objects, each with keys: "
            f'"title" (article title), "url" (full URL), and '
            f'"relevance_score" (integer 1-100, where 100 is most relevant). '
            f"Provide at least 5 and at most 15 results. "
            f"Also include a brief scholarly assessment (2-3 sentences) of the "
            f"overall quality and relevance of the search results."
        )

        result = _call_deepseek(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            web_search=True,
            max_tokens=4096,
        )

        # Parse the JSON array from the response content
        raw_content = result["content"].strip()
        articles = []
        scholarly_assessment = ""

        # The model may wrap the JSON in markdown code fences — strip them
        if raw_content.startswith("```"):
            # Find the first newline and the last ```
            first_nl = raw_content.find("\n")
            last_fence = raw_content.rfind("```")
            if first_nl != -1 and last_fence != -1:
                raw_content = raw_content[first_nl + 1 : last_fence].strip()

        try:
            parsed = json.loads(raw_content)
            if isinstance(parsed, list):
                articles = parsed
            elif isinstance(parsed, dict):
                # Some models return {"articles": [...], "assessment": "..."}
                articles = parsed.get("articles", [])
                scholarly_assessment = parsed.get("assessment", "")
        except json.JSONDecodeError:
            # If JSON parsing fails, return the raw content as trace
            pass

        _update_log_completed(
            run_id=run_id,
            trace_reasoning=result["trace_reasoning"],
            tokens_used=result["tokens_used"],
            articles_found=len(articles),
        )

        return {
            "articles": articles,
            "trace_reasoning": result["trace_reasoning"],
            "tokens_used": result["tokens_used"],
            "assessment": scholarly_assessment,
        }

    except Exception as e:
        _update_log_failed(run_id=run_id, error_message=str(e))
        raise


def generate_snippet(content: str, slug: str) -> str:
    """
    Non-search DeepSeek call requesting a 2-3 sentence archival-quality summary
    in scholarly tone.

    Logs to agent_run_log with pipeline = 'snippet_generation'.

    Args:
        content: The Markdown/HTML content to summarise.
        slug: The record slug for logging.

    Returns:
        The generated snippet string (2-3 sentences).
    """
    run_id = _insert_log_run(pipeline="snippet_generation", record_slug=slug)

    try:
        system_prompt = (
            "You are an archival editor for The Jesus Website, a scholarly "
            "website organising historical information about Jesus of Nazareth. "
            "Your summaries are concise (2-3 sentences), precise, and written "
            "in an academic yet accessible tone."
        )

        user_prompt = (
            f"Write a concise 2-3 sentence archival-quality summary of the "
            f"following content. The summary should capture the key historical "
            f"or theological insight while remaining accessible to a general "
            f"audience. Use the scholarly tone of the website.\n\n"
            f"CONTENT:\n{content}"
        )

        result = _call_deepseek(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            web_search=False,
            max_tokens=512,
        )

        snippet = result["content"].strip()

        _update_log_completed(
            run_id=run_id,
            trace_reasoning=result["trace_reasoning"],
            tokens_used=result["tokens_used"],
        )

        return snippet

    except Exception as e:
        _update_log_failed(run_id=run_id, error_message=str(e))
        raise


def generate_slug(title: str, slug: str) -> str:
    """
    Non-search DeepSeek call requesting a one-to-two-word URL-friendly slug
    phrase (lowercase, hyphenated, no stop words).

    Logs to agent_run_log with pipeline = 'slug_generation'.

    Args:
        title: The record title to derive a slug from.
        slug: The record slug for logging.

    Returns:
        The generated slug string (one-to-two words, lowercase, hyphenated).
    """
    run_id = _insert_log_run(pipeline="slug_generation", record_slug=slug)

    try:
        system_prompt = (
            "You are an archival editor for The Jesus Website, a scholarly "
            "website organising historical information about Jesus of Nazareth. "
            "You produce clean, URL-friendly slug phrases from record titles."
        )

        user_prompt = (
            f"Convert the following record title into a one-to-two-word "
            f"URL-friendly slug phrase. Rules:\n"
            f"- Output ONLY the slug (no explanation, no quotes, no markdown).\n"
            f"- Lowercase only.\n"
            f"- Use hyphens between words (e.g., 'jesus-baptism').\n"
            f"- Remove stop words (the, a, an, of, in, on, at, to, for, etc.).\n"
            f"- Keep it concise: 1-2 words maximum.\n"
            f"- Preserve key meaning from the title.\n\n"
            f"TITLE: {title}"
        )

        result = _call_deepseek(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            web_search=False,
            max_tokens=64,
        )

        generated_slug = result["content"].strip()

        # Sanitise: DeepSeek may return markdown formatting, backticks, or
        # quoted text despite explicit instructions. Defensively strip all
        # non-slug characters to produce a clean URL-safe phrase.
        generated_slug = generated_slug.lower().strip()
        # Replace spaces and underscores with hyphens
        generated_slug = generated_slug.replace(" ", "-").replace("_", "-")
        # Collapse multiple hyphens
        while "--" in generated_slug:
            generated_slug = generated_slug.replace("--", "-")
        # Strip leading/trailing hyphens
        generated_slug = generated_slug.strip("-")
        # Remove any characters that aren't lowercase letters or hyphens
        generated_slug = "".join(c for c in generated_slug if c.islower() or c == "-")

        if not generated_slug:
            # Fallback: use the title sanitised
            generated_slug = title.lower().strip()
            generated_slug = "".join(
                c for c in generated_slug if c.islower() or c == " " or c == "-"
            )
            generated_slug = generated_slug.replace(" ", "-")
            while "--" in generated_slug:
                generated_slug = generated_slug.replace("--", "-")
            generated_slug = generated_slug.strip("-")[:80]

        _update_log_completed(
            run_id=run_id,
            trace_reasoning=result["trace_reasoning"],
            tokens_used=result["tokens_used"],
        )

        return generated_slug

    except Exception as e:
        _update_log_failed(run_id=run_id, error_message=str(e))
        raise


def generate_metadata(content: str, slug: str) -> dict:
    """
    Non-search DeepSeek call requesting 5-10 SEO keywords and a meta-description
    (max 160 chars).

    Logs to agent_run_log with pipeline = 'metadata_generation'.

    Args:
        content: The Markdown/HTML content to extract metadata from.
        slug: The record slug for logging.

    Returns:
        dict with keys:
            - keywords: Comma-separated string of 5-10 SEO keywords.
            - meta_description: Meta description string (max 160 chars).
    """
    run_id = _insert_log_run(pipeline="metadata_generation", record_slug=slug)

    try:
        system_prompt = (
            "You are an SEO specialist for The Jesus Website, a scholarly "
            "archive of historical information about Jesus of Nazareth. "
            "You extract precise, accurate metadata from content."
        )

        user_prompt = (
            f"Analyse the following content and return a JSON object with exactly "
            f"two keys:\n"
            f'  "keywords": A comma-separated string of 5-10 SEO keywords '
            f"relevant to the content.\n"
            f'  "meta_description": A 1-2 sentence meta description '
            f"(maximum 160 characters) summarising the content for search engines.\n\n"
            f"Use scholarly but accessible language. Return ONLY valid JSON.\n\n"
            f"CONTENT:\n{content}"
        )

        result = _call_deepseek(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            web_search=False,
            max_tokens=512,
        )

        raw_content = result["content"].strip()

        # Strip markdown code fences if present
        if raw_content.startswith("```"):
            first_nl = raw_content.find("\n")
            last_fence = raw_content.rfind("```")
            if first_nl != -1 and last_fence != -1:
                raw_content = raw_content[first_nl + 1 : last_fence].strip()

        try:
            metadata = json.loads(raw_content)
        except json.JSONDecodeError:
            # Fallback: return raw content as keywords
            metadata = {
                "keywords": raw_content[:200],
                "meta_description": raw_content[:160],
            }

        _update_log_completed(
            run_id=run_id,
            trace_reasoning=result["trace_reasoning"],
            tokens_used=result["tokens_used"],
        )

        return {
            "keywords": metadata.get("keywords", ""),
            "meta_description": metadata.get("meta_description", ""),
        }

    except Exception as e:
        _update_log_failed(run_id=run_id, error_message=str(e))
        raise
