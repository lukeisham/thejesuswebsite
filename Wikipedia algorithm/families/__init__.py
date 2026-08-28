"""Vector signal families for the Wikipedia v2 ranking pipeline.

Each family module implements one bias-detection signal, querying vector stores
built from hand-authored exemplar passages. Families ship independently; if a
family's calibrated precision is under the 0.8 floor, it falls back to the
existing keyword detector.

This package is an offline developer-machine tool. The VPS never runs it.
"""

import sys
from pathlib import Path

# Make the sibling classifier package importable for the modules below that
# need it (stores.py re-exports classifier.stores.Embedder/VectorStore). Runs
# exactly once — the first time anything under families/ is imported — instead
# of once per module that used to carry this same insert at its own top level.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

__version__ = "0.1.0"
