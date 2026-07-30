#!/usr/bin/env python3
"""Replace stale 'Wikipedia algorithm v2' path references with 'Wikipedia algorithm'
now that the directory has been renamed (v1 retired, v2 suffix no longer needed).
Only touches literal path-style references, not this script's own comment.
"""
import pathlib

FILES = [
    "setup/Wikipedia algorithm/Wikipedia_alogrithm_refractor.md",
    "setup/Wikipedia algorithm/GOLD_SET_README.md",
    "setup/Wikipedia algorithm/Wikipedia Articles - Reference.md",
    "setup/Wikipedia algorithm/families/config.py",
    "frontend/assets/js/utils/wikipedia-signals.test.js",
    "setup/SKILLS/!TheJesusWebsite-Wikipedia/skill.md",
    "frontend/assets/js/utils/wikipedia-signals.js",
    "vector-sidecar/families.py",
    "vector-sidecar/embedder.py",
]

ROOT = pathlib.Path("/Users/lukeishammacbookair/Developer/thejesuswebsite")

for rel in FILES:
    path = ROOT / rel
    text = path.read_text(encoding="utf-8")
    count = text.count("Wikipedia algorithm v2")
    new_text = text.replace("Wikipedia algorithm v2", "Wikipedia algorithm")
    path.write_text(new_text, encoding="utf-8")
    print(f"{rel}: replaced {count} occurrence(s)")
