# =============================================================================
#   THE JESUS WEBSITE — METADATA GENERATOR
#   File:    backend/scripts/metadata_generator.py
#   Version: 1.0.0
#   Purpose: DeepSeek-powered SEO/Keyword extraction for records.
#
#   TRIGGER:  Called by the admin API's POST /api/admin/metadata/generate endpoint,
#             or imported directly by dashboard JS tools via the API.
#   FUNCTION: Accepts a document's Markdown/HTML content and slug, calls
#             agent_client.generate_metadata(), and returns SEO keywords and a
#             meta-description.
#   OUTPUT:   Returns a dict with 'keywords' (comma-separated string) and
#             'meta_description' (string, max 160 chars). The caller saves both
#             to the record via the existing PUT /api/admin/records/{id} endpoint.
#
#   QUIRKS:
#     - The actual DeepSeek call and agent_run_log recording are delegated to
#       agent_client.py. This script is a thin wrapper that validates inputs
#       and provides a clean interface for the admin API.
#     - If the content is empty or too short (< 100 chars), the script raises
#       ValueError rather than wasting an API call on insufficient input.
#
#   IDEMPOTENCY:
#     Safe to run repeatedly. Each invocation generates fresh metadata.
# =============================================================================

import os
import sys

# Ensure the backend/scripts package is importable
sys.path.insert(
    0,
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
)

from backend.scripts.agent_client import generate_metadata as _agent_generate_metadata

MIN_CONTENT_LENGTH = 100


def generate_metadata(content: str, slug: str) -> dict:
    """
    Generate SEO keywords and a meta-description for the given content.

    Args:
        content: The Markdown/HTML content to analyse.
        slug: The record's unique slug for logging.

    Returns:
        dict with keys:
            - keywords (str): Comma-separated SEO keywords (5-10 terms).
            - meta_description (str): Meta description, max 160 characters.

    Raises:
        ValueError: If content is empty or too short.
        RuntimeError: If the DeepSeek API call fails (from agent_client).
    """
    if not content or not content.strip():
        raise ValueError("Content is empty — cannot generate metadata.")

    if len(content.strip()) < MIN_CONTENT_LENGTH:
        raise ValueError(
            f"Content is too short ({len(content.strip())} chars, "
            f"minimum {MIN_CONTENT_LENGTH}) — cannot generate meaningful metadata."
        )

    return _agent_generate_metadata(content=content.strip(), slug=slug)


# ---------------------------------------------------------------------------
# CLI entry point for manual testing
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse
    import json

    parser = argparse.ArgumentParser(description="Generate SEO metadata for a record.")
    parser.add_argument("--slug", required=True, help="Record slug for logging")
    parser.add_argument(
        "--content", required=True, help="Markdown/HTML content to analyse"
    )
    args = parser.parse_args()

    try:
        result = generate_metadata(content=args.content, slug=args.slug)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
