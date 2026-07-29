"""Unit tests for the gnostic-over-emphasis family."""

import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from families.gnostic_over_emphasis import score


class TestGnosticOverEmphasis(unittest.TestCase):
    """Tests for gnostic-over-emphasis scoring logic."""

    def test_fallback_when_store_none(self) -> None:
        result = score("text", [], {}, embedder=None, store=None)
        self.assertTrue(result.get("fallback", False))


if __name__ == "__main__":
    unittest.main()
