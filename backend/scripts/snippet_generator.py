# =============================================================================
#   THE JESUS WEBSITE — SNIPPET GENERATOR
#   File:    backend/scripts/snippet_generator.py
#   Version: 1.0.0
#   Purpose: DeepSeek-powered archival abstract generation for records.
#
#   TRIGGER:  Called by the admin API's POST /api/admin/snippet/generate endpoint,
#             or imported directly by dashboard JS tools via the API.
#   FUNCTION: Accepts a text block (Markdown/HTML) and record slug, calls
#             agent_client.generate_snippet(), and returns a concise 2-3 sentence
#             scholarly summary.
#   OUTPUT:   Returns the generated snippet string. The caller (JS frontend or API)
#             is responsible for saving it to the record.
#
#   QUIRKS:
#     - The actual DeepSeek call and agent_run_log recording are delegated to
#       agent_client.py. This script is a thin wrapper that provides a clean
#       interface for the admin API.
#     - If the content is empty or too short (< 50 chars), the script returns
#       a fallback message rather than wasting an API call.
#
#   IDEMPOTENCY:
#     Safe to run repeatedly. Each invocation generates a fresh snippet.
# =============================================================================

import os
import sys

# Ensure the backend/scripts package is importable
sys.path.insert(
    0,
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
)

from backend.scripts.agent_client import generate_snippet as _agent_generate_snippet

MIN_CONTENT_LENGTH = 50


def generate_snippet(content: str, slug: str) -> str:
    """
    Generate a 2-3 sentence archival-quality summary for the given content.

    Args:
        content: The Markdown/HTML content to summarise.
        slug: The record's unique slug for logging.

    Returns:
        str: The generated snippet.

    Raises:
        ValueError: If content is empty or too short.
        RuntimeError: If the DeepSeek API call fails (from agent_client).
    """
    if not content or not content.strip():
        raise ValueError("Content is empty — cannot generate snippet.")

    if len(content.strip()) < MIN_CONTENT_LENGTH:
        raise ValueError(
            f"Content is too short ({len(content.strip())} chars, "
            f"minimum {MIN_CONTENT_LENGTH}) — cannot generate meaningful snippet."
        )

    return _agent_generate_snippet(content=content.strip(), slug=slug)


# ---------------------------------------------------------------------------
# CLI entry point for manual testing
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate a scholarly snippet for a record."
    )
    parser.add_argument("--slug", required=True, help="Record slug for logging")
    parser.add_argument(
        "--content", required=True, help="Markdown/HTML content to summarise"
    )
    args = parser.parse_args()

    try:
        result = generate_snippet(content=args.content, slug=args.slug)
        print("Generated snippet:")
        print(result)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
