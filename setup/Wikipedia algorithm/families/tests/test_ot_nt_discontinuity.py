"""Unit tests for the OT-NT-discontinuity family."""

import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from families.ot_nt_discontinuity import score


class TestOTNTDiscontinuity(unittest.TestCase):
    """Tests for OT-NT-discontinuity scoring logic."""

    def test_fallback_when_store_none(self) -> None:
        result = score("Some text", embedder=None, store=None)
        self.assertTrue(result.get("fallback", False))

    def test_empty_text(self) -> None:
        result = score("", embedder=None, store=None)
        self.assertTrue(result.get("fallback", False))


if __name__ == "__main__":
    unittest.main()
