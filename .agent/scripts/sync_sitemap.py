# =============================================================================
#   THE JESUS WEBSITE — SITEMAP SYNC TOOL (AGENT UTILITY)
#   File:    .agent/scripts/sync_sitemap.py
#   Version: 1.2.0
#   Purpose: Merges all module-level ASCII file trees from module_sitemap.md
#            into the master site_map.md and auto-increments its version number.
#
#   DATA FLOW:
#     Input   →  documentation/detailed_module_sitemap.md  (### headings + ```text blocks)
#     Output  →  documentation/site_map.md                  (```text master tree, version field)
#
#   USAGE:
#     Run from the project root:
#       python3 .agent/scripts/sync_sitemap.py
#       python3 .agent/scripts/sync_sitemap.py --dry-run   (preview only, no writes)
#
#   QUIRKS:
#     - The parser strips ASCII box-drawing characters to calculate indent depth.
#     - Depth is computed as (leading whitespace + branch chars) // 4.
#     - All trees are merged into a single sorted dict before rendering.
#     - If zero file-tree blocks are found, the script aborts with an error
#       (no destructive empty-tree write).
# =============================================================================
import argparse
import os
import re
import sys

MODULE_FILE = "documentation/detailed_module_sitemap.md"
SITE_FILE = "documentation/site_map.md"


def parse_ascii_tree(block):
    """
    Parses a raw ASCII file-tree block into a list of (path_list, is_dir, annotation) tuples.
    Strips box-drawing characters (├──, └──, │) to determine node depth.
    """
    paths = []
    lines = block.strip().split("\n")
    stack = {}

    for line in lines:
        if not line.strip():
            continue

        # Split out annotations
        parts = line.split("<--")
        annotation = ("<-- " + parts[1].strip()) if len(parts) > 1 else ""

        # Calculate depth by stripping branch prefix characters.
        # Use regex to match the leading branch/whitespace portion.
        prefix_match = re.match(r"^([\s├└│─┬┤┘┐┌┼]+)", parts[0])
        prefix_len = len(prefix_match.group(1)) if prefix_match else 0
        depth = prefix_len // 4

        node_name = re.sub(r"^[\s├└│─┬┤┘┐┌┼]+", "", parts[0]).strip()
        if not node_name:
            continue

        # Maintain path stack
        stack[depth] = node_name
        current_path = [stack[d].strip("/") for d in range(depth + 1) if d in stack]

        is_dir = node_name.endswith("/") or parts[0].strip().endswith("/")
        paths.append((current_path, is_dir, annotation))

    return paths


def build_dict_tree(all_paths):
    """
    Converts a flat list of path tuples into a nested dictionary representing
    the full directory tree. Tracks is_dir and annotation per node.
    """
    root = {}
    for path_list, is_dir, annot in all_paths:
        current = root
        for i, part in enumerate(path_list):
            if part not in current:
                current[part] = {"_is_dir": False, "_annot": ""}

            if i == len(path_list) - 1:
                current[part]["_is_dir"] = is_dir
                if annot:
                    current[part]["_annot"] = annot

            current = current[part]
    return root


def render_ascii_tree(tree, indent=""):
    """
    Recursively renders a nested dict tree back into an ASCII file-tree string.
    Uses ├── for non-last entries and └── for the last entry at each level.
    """
    lines = []
    keys = sorted([k for k in tree.keys() if not k.startswith("_")])
    for i, key in enumerate(keys):
        is_last = i == len(keys) - 1
        node = tree[key]

        prefix = "└── " if is_last else "├── "
        display_name = key + (
            "/" if node.get("_is_dir") and not key.endswith("/") else ""
        )
        annot = node.get("_annot", "")

        if indent == "" and key == "":
            display_name = "/"
            line = f"{display_name:<31} {annot}".strip()
            lines.append(line)
        else:
            line_str = f"{indent}{prefix}{display_name}"
            if annot:
                pad_len = max(31 - len(line_str), 1)
                line_str += " " * pad_len + annot
            lines.append(line_str)

        next_indent = indent + ("    " if is_last else "│   ")
        lines.extend(render_ascii_tree(node, next_indent))
    return lines


def extract_file_tree_blocks(content, source_label=""):
    """
    Extract all ASCII file-tree blocks from the source document.

    Matches ```text fence blocks that contain ASCII tree branch characters
    (├──, └──, or │), filtering out non-tree diagrams like box-art tables.

    Also matches the legacy bold-text-header format for backward compatibility.

    Returns (blocks, block_count).
    """
    blocks = []

    # Primary pattern: all ```text fenced blocks
    raw_blocks = re.findall(r"```text\n(.*?)\n```", content, re.DOTALL)

    # Secondary: legacy **Bold Header:** format
    legacy_blocks = re.findall(
        r"\*\*(?:Files to create Structure|Supporting Files [^:]+):\*\*\s*```\w*\n(.*?)\n```",
        content,
        re.DOTALL,
    )

    # Filter to only blocks containing ASCII tree branch characters
    tree_chars = ("├──", "└──", "│")
    for block in raw_blocks:
        if any(c in block for c in tree_chars) and block not in blocks:
            blocks.append(block)
    for block in legacy_blocks:
        if block not in blocks:
            blocks.append(block)

    return blocks, len(blocks)


def main():
    """
    Trigger:  Run this script directly from the project root.
    Function: Reads all module file trees from detailed_module_sitemap.md,
              merges them, renders a combined ASCII tree, and writes it into
              site_map.md, bumping its version number.
    Output:   Updated site_map.md or a dry-run preview.
    """
    parser = argparse.ArgumentParser(description="Sync sitemap")
    parser.add_argument(
        "--dry-run", action="store_true", help="Preview only, do not write"
    )
    args = parser.parse_args()

    if not os.path.exists(MODULE_FILE):
        print(f"Error: {MODULE_FILE} not found.")
        sys.exit(1)

    with open(MODULE_FILE, "r") as f:
        content = f.read()

    blocks, block_count = extract_file_tree_blocks(content, MODULE_FILE)

    # ── Safety gate: reject zero-block runs ──────────────────────────────
    if block_count == 0:
        print(
            f"Error: found 0 ASCII file-tree blocks in {MODULE_FILE}.\n"
            "The source document may use a format the parser doesn't recognise. "
            "Expected ```text code fences containing '├──' / '└──' branch lines.\n"
            "Aborting — site_map.md was NOT modified."
        )
        sys.exit(1)

    # ── Parse and merge ──────────────────────────────────────────────────
    all_paths = []
    for block in blocks:
        all_paths.extend(parse_ascii_tree(block))

    master_tree = build_dict_tree(all_paths)
    ascii_lines = render_ascii_tree(master_tree)
    tree_text = "```text\n" + "\n".join(ascii_lines) + "\n```"

    if not os.path.exists(SITE_FILE):
        print(f"Error: {SITE_FILE} not found.")
        sys.exit(1)

    with open(SITE_FILE, "r") as f:
        site_content = f.read()

    # ── Version bump ─────────────────────────────────────────────────────
    old_version = "unknown"
    m = re.search(r"version:\s*([0-9\.]+)", site_content)
    if m:
        old_version = m.group(1)

    def bump_version(match):
        v = match.group(1).split(".")
        v[-1] = str(int(v[-1]) + 1)
        return "version: " + ".".join(v)

    new_site_content = re.sub(r"version:\s*([0-9\.]+)", bump_version, site_content, count=1)

    # ── Replace the first master tree block only ───────────────────────────
    if "```text" in new_site_content:
        new_site_content = re.sub(
            r"```text\n.*?\n```", tree_text, new_site_content, count=1, flags=re.DOTALL
        )
    else:
        new_site_content = re.sub(
            r"```\n.*?\n```", tree_text, new_site_content, count=1, flags=re.DOTALL
        )

    new_version = "unknown"
    m = re.search(r"version:\s*([0-9\.]+)", new_site_content)
    if m:
        new_version = m.group(1)

    # ── Output ───────────────────────────────────────────────────────────
    if args.dry_run:
        print(f"[DRY RUN] Would update {SITE_FILE}")
        print(f"  Source: {MODULE_FILE}")
        print(f"  File-tree blocks found: {block_count}")
        print(f"  Merged nodes: {len(all_paths)}")
        print(f"  Version: {old_version} → {new_version}")
        print("  (no files were modified)")
    else:
        with open(SITE_FILE, "w") as f:
            f.write(new_site_content)
        print(f"Merged {block_count} file-tree blocks → {len(all_paths)} nodes")
        print(f"Updated {SITE_FILE}  ({old_version} → {new_version})")


if __name__ == "__main__":
    main()
