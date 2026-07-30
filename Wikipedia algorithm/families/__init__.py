"""Vector signal families for the Wikipedia v2 ranking pipeline.

Each family module implements one bias-detection signal, querying vector stores
built from hand-authored exemplar passages. Families ship independently; if a
family's calibrated precision is under the 0.8 floor, it falls back to the
existing keyword detector.

This package is an offline developer-machine tool. The VPS never runs it.
"""

__version__ = "0.1.0"
