# =============================================================================
#   THE JESUS WEBSITE — JS/CSS MINIFICATION TOOL
#   File:    tools/minify_admin.py
#   Version: 1.1.0
#   Purpose: Obfuscates and minifies admin tools prior to production deployment.
# =============================================================================

import logging
import os
import re
import sys

# Ensure package context is recognized when running directly from CLI
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.middleware.logger_setup import setup_logger

# Initialize central logging to /logs
logger = setup_logger(__file__)
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TARGETS = [
    os.path.join(ROOT_DIR, "admin", "frontend"),
    os.path.join(ROOT_DIR, "css", "design_layouts", "views"),
]


def minify_js(content):
    """
    Basic string-based JS minification. Removes block comments and compresses whitespace.
    Note: Single-line comment stripping is disabled to avoid clobbering embedded URLs.
    """
    # Remove multi-line comments
    content = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)
    # Remove single-line comments (disabled: unsafe for strings containing URLs)
    # content = re.sub(r'//.*', '', content)
    # Remove superfluous whitespace
    content = re.sub(r"\s+", " ", content)
    return content.strip()


def minify_css(content):
    """Basic string-based CSS minification. Removes comments and tightens punctuation spacing."""
    content = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)
    content = re.sub(r"\s+", " ", content)
    content = (
        content.replace("; ", ";")
        .replace(": ", ":")
        .replace(" {", "{")
        .replace("} ", "}")
    )
    return content.strip()


def minify_files():
    """
    Trigger:  Run directly via CLI or via build.py.
    Function: Walks TARGETS directories, minifies each .js and .css file and writes
              the result alongside the original with a .min suffix (e.g. admin.js
              produces admin.min.js). The original dev files are never overwritten.
    Output:   Logged size reduction report per file with compression percentage.
    """
    logger.info("Starting Admin UI Minification sequence...")
    files_processed = 0

    for directory in TARGETS:
        if not os.path.exists(directory):
            continue

        for root, dirs, files in os.walk(directory):
            for file in files:
                filepath = os.path.join(root, file)

                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()

                original_size = len(content)
                if original_size == 0:
                    continue

                if file.endswith(".js"):
                    minified = minify_js(content)
                elif file.endswith(".css"):
                    minified = minify_css(content)
                else:
                    continue

                # Write the minified file alongside the original with a .min suffix.
                # e.g. admin.js -> admin.min.js (preserves the dev original).
                base, ext = os.path.splitext(filepath)
                min_path = base + ".min" + ext
                with open(min_path, "w", encoding="utf-8") as f:
                    f.write(minified)
                new_size = len(minified)
                files_processed += 1
                reduction = ((original_size - new_size) / original_size) * 100
                logger.info(
                    f"Minified: {file} -> {os.path.basename(min_path)} "
                    f"({original_size} -> {new_size} bytes, -{reduction:.1f}%)"
                )

    logger.info(f"Minification logic finalized over {files_processed} files.")


if __name__ == "__main__":
    minify_files()
