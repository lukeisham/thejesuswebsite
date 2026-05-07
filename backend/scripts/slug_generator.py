# =============================================================================
#   THE JESUS WEBSITE — SLUG GENERATOR
#   File:    backend/scripts/slug_generator.py
#   Version: 1.0.0
#   Purpose: DeepSeek-powered URL-slug generation for records.
#
#   TRIGGER:  Called by the admin API's POST /api/admin/slug/generate endpoint,
#             or imported directly by dashboard JS tools via the API.
#   FUNCTION: Accepts a record title string and slug, calls
#             agent_client.generate_slug(), and returns a one-to-two-word
#             URL-friendly slug phrase (lowercase, hyphenated, no stop words).
#   OUTPUT:   Returns the generated slug string. The caller (JS frontend or API)
#             is responsible for saving it to the record.
#
#   QUIRKS:
#     - The actual DeepSeek call and agent_run_log recording are delegated to
#       agent_client.py. This script is a thin wrapper that validates inputs
#       and provides a clean interface for the admin API.
#     - If the title is empty or too short (< 3 chars), the script raises
#       ValueError rather than wasting an API call on insufficient input.
#
#   IDEMPOTENCY:
#     Safe to run repeatedly. Each invocation generates a fresh slug.
# =============================================================================

import os
import sys

# Ensure the backend/scripts package is importable
sys.path.insert(
    0,
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
)

from backend.scripts.agent_client import generate_slug as _agent_generate_slug

MIN_TITLE_LENGTH = 3


def generate_slug(title: str, slug: str) -> str:
    """
    Generate a one-to-two-word URL-friendly slug phrase from the given title.

    Args:
        title: The record title to derive a slug from.
        slug: The record's unique slug for logging.

    Returns:
        str: The generated slug (lowercase, hyphenated, no stop words).

    Raises:
        ValueError: If title is empty or too short.
        RuntimeError: If the DeepSeek API call fails (from agent_client).
    """
    if not title or not title.strip():
        raise ValueError("Title is empty — cannot generate slug.")

    if len(title.strip()) < MIN_TITLE_LENGTH:
        raise ValueError(
            f"Title is too short ({len(title.strip())} chars, "
            f"minimum {MIN_TITLE_LENGTH}) — cannot generate meaningful slug."
        )

    return _agent_generate_slug(title=title.strip(), slug=slug)


# ---------------------------------------------------------------------------
# CLI entry point for manual testing
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Generate a URL-friendly slug for a record title."
    )
    parser.add_argument("--slug", required=True, help="Record slug for logging")
    parser.add_argument(
        "--title", required=True, help="Record title to derive slug from"
    )
    args = parser.parse_args()

    try:
        result = generate_slug(title=args.title, slug=args.slug)
        print("Generated slug:")
        print(result)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
